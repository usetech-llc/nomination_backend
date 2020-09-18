import Validator from "./models/validator";
import config from "../config";
import { ApiPromise } from "@polkadot/api";
import Era from "./models/era";
import { DeriveStakingElected } from "@polkadot/api-derive/staking/types";
import Rpi from "./models/rpi";
import BN from "bn.js";
import { Mongoose } from "mongoose";
import { mongoMemoize, MemoizedCallInfo, readMemoized } from "../mongo/memoized-requests";
import { addBadValidator } from "../mongo/bad-validators-log";
import { RpiMongoNames } from "../models/rpi-mongo-names";
import { Exposure, ValidatorPrefs } from "@polkadot/types/interfaces/staking/types";
import AccountId from "@polkadot/types/generic/AccountId";
import { Option } from "@polkadot/types";
import { BalanceOf } from "@polkadot/types/interfaces/runtime/types";
import SubstrateClient from "../substrate/substrate-client";

type ReportProgress = (args: {current: number, total: number}) => Promise<any>;

class RpiService {
  
  constructor(
    private client: SubstrateClient,
    private mongo: Mongoose) {
  }

  public electedInfoCall(era: number): MemoizedCallInfo<number, DeriveStakingElected> {
    return {
      call: () => this.client.promisifySubstrate(api => api.derive.staking.electedInfo()),
      name: RpiMongoNames.electedInfo,
      params: era
    };
  }

  public loadEraCall(era: number, elected: DeriveStakingElected): MemoizedCallInfo<number, Era> {
    return {
      call: () => this.loadEra(era, elected),
      name: RpiMongoNames.loadEra,
      params: era
    };
  }

  public erasStakersCall(era: number, accountId: AccountId | string): MemoizedCallInfo<{era: number, accountId: string}, Exposure> {
    return {
      call: () => this.client.promisifySubstrate(api => api.query.staking.erasStakers(era, accountId)),
      name: RpiMongoNames.erasStakers,
      params: {
        era,
        accountId: accountId.toString()
      }
    };
  }

  public erasValidatorRewardCall(era: number): MemoizedCallInfo<number, Option<BalanceOf>> {
    return {
      call: () => this.client.promisifySubstrate(api => api.query.staking.erasValidatorReward(era)),
      name: RpiMongoNames.erasValidatorReward,
      params: era
    };
  }

  public erasValidatorPrefsCall(era: number, accountId: AccountId | string): MemoizedCallInfo<{era: number, accountId: string}, ValidatorPrefs> {
    return {
      call: () => this.client.promisifySubstrate(api => api.query.staking.erasValidatorPrefs(era, accountId)),
      name: RpiMongoNames.erasValidatorPrefs,
      params: {
        era,
        accountId: accountId.toString()
      }
    };
  }

  public erasRange(era: number): number[] {
    return new Array(config.erasRange).fill(0).map((_, index) => era - index).filter(v => v >= 0);
  }

  public async areBestValidatorsMemoized(era: number): Promise<boolean> {
    const elected = await readMemoized(this.mongo, this.electedInfoCall(era));
    if(!elected) {
      return false;
    }

    const erasRange = this.erasRange(era);
    const areMemoized = (await Promise.all(erasRange.map(era => readMemoized(this.mongo, this.loadEraCall(era, elected)))))
      .map(e => !!e)
      .reduce((prev, cur) => prev && cur, true);

    return areMemoized;
  }

  public async bestValidators(ksi: number, era: number, reportProgress: ReportProgress = undefined): Promise<Validator[]> {
    const eraNumbers = this.erasRange(era);

    let currentProgress = 0;
    let totalProgress = eraNumbers.length + 1;

    reportProgress && await reportProgress({current: currentProgress++, total: totalProgress});

    const electedInfo = await mongoMemoize(this.mongo, this.electedInfoCall(era));

    reportProgress && await reportProgress({current: currentProgress++, total: totalProgress});
    
    const eras: Era[] = [];
    for(let i = 0; i < eraNumbers.length; i++) {
      eras.push(await mongoMemoize(this.mongo, this.loadEraCall(eraNumbers[i], electedInfo)));
      reportProgress && await reportProgress({current: currentProgress++, total: totalProgress});
    }

    const rpis = electedInfo.info
      .map(i => ({ accountId: i.accountId.toString(), exposure: i.exposure, validatorPrefs: i.validatorPrefs}))
      .map(v => ({ accountId: v.accountId, exposure: v.exposure, validatorPrefs: v.validatorPrefs, meanAndStdDeviation: this.meanAndStdDeviation(eras.map(e => e.rpis[v.accountId] || 0)) }))
      .map(v => ({ accountId: v.accountId, exposure: v.exposure, validatorPrefs: v.validatorPrefs, rpiQuality: this.rpiQuality(v.meanAndStdDeviation, ksi)}));
    
    rpis
      .filter(r => r.rpiQuality.error !== undefined)
      .forEach(r => addBadValidator(this.mongo, { era: era, reason: r.rpiQuality.error, validator: r.accountId }));
    
    const validators: Validator[] = 
      rpis
      .filter(r => r.rpiQuality.rpi !== undefined)
      .map(r => ({...r, rpiQuality: r.rpiQuality.rpi}));

    return validators.sort((a, b) => b.rpiQuality - a.rpiQuality);
  }

  public rpiQuality({ mean, stdDeviation }: { mean: number; stdDeviation: number; }, ksi: number): { rpi: number | undefined, error: string | undefined } {
    if (ksi < 0 || ksi > 1) {
      throw `invalid parameter - ksi = ${ksi}`;
    }

    if(stdDeviation === 0) {
      return {
        rpi: undefined,
        error: 'Standart deviation is zero.'
      };
    }

    if (0 <= ksi && ksi < 0.5) {
      const rpiQuality = (2 * (mean - 1) * ksi + 1) / stdDeviation;
      return {
        rpi: rpiQuality,
        error: undefined
      };
    } else {
      const phi = 2 * ksi - 2;
      const rpiQuality = mean * (phi - phi / stdDeviation + 1);
      return {
        rpi: rpiQuality,
        error: undefined
      };
    }
  }

  public meanAndStdDeviation(array: number[]): { mean: number, stdDeviation: number } {
    let n = 0,
      m = 0,
      s = 0;

    let previousMean = 0;
    array.forEach(x => {
      previousMean = m;
      n++;
      m = m + (x - m) / n;
      s = s + (x - m) * (x - previousMean);
    });

    return {
      mean: m,
      stdDeviation: Math.sqrt(s / (n - 1))
    };
  }

  public async loadEra(eraNumber: number, electedInfo: DeriveStakingElected): Promise<Era> {
    const rpis: { [accountId: string]: Rpi } = {};

    await Promise.all(electedInfo.info.map(async staking => {
      const accountId = staking.accountId;

      const [exposure, eraReward, eraPrefs] = 
        await Promise.all([
          mongoMemoize(this.mongo, this.erasStakersCall(eraNumber, accountId)),
          mongoMemoize(this.mongo, this.erasValidatorRewardCall(eraNumber)),
          mongoMemoize(this.mongo, this.erasValidatorPrefsCall(eraNumber, accountId))
      ]);

      let eraRewardNumber = 0;
      if(eraReward && eraReward.unwrapOr) {
        eraRewardNumber = eraReward.unwrapOr(new BN(0)).toNumber();
      } else if(eraReward) {
        eraRewardNumber = eraReward as unknown as number;
      }

      let commission: number = 0;
      if(eraPrefs.commission.unwrap)
      {
        commission = eraPrefs.commission.unwrap().div(new BN(config.permill)).div(new BN(1000)).toNumber();
      } else {
        commission = eraPrefs.commission as unknown as number;
        commission /= config.permill;
      }

      const totalExposure = +exposure.total;

      let rewardPerInvestment = 0;
      if (totalExposure > 0) {
        rewardPerInvestment = eraRewardNumber * (1.0 - commission) / totalExposure;
      }

      rpis[accountId.toString()] = rewardPerInvestment;
    }));


    return {
      eraNumber,
      rpis
    };
  }
}

export default RpiService;