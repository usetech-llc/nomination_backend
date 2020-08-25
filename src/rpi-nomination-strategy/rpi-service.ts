import Validator from "./models/validator";
import config from "../config";
import { ApiPromise } from "@polkadot/api";
import Era from "./models/era";
import { DeriveStakingElected } from "@polkadot/api-derive/staking/types";
import Rpi from "./models/rpi";
import BN from "bn.js";
import { Mongoose } from "mongoose";
import { mongoMemoize, addBadValidator } from "../utils/mongo";


class RpiService {
  
  constructor(
    private api: ApiPromise,
    private mongo: Mongoose) {
  }

  public async bestValidators(ksi: number, era: number): Promise<Validator[]> {

    const electedInfo = await mongoMemoize(this.mongo, `electedInfo(${era})`, () => this.api.derive.staking.electedInfo());

    const eraNumbers = new Array(config.erasRange).fill(0).map((_, index) => era - index).filter(v => v >= 0);

    const eras: Era[] = [];
    for(let i = 0; i < eraNumbers.length; i++) {
      eras.push(await mongoMemoize(this.mongo, `loadEra(${eraNumbers[i]})`, () => this.loadEra(eraNumbers[i], electedInfo)));
    }

    const rpis = electedInfo
      .info.map(i => i.accountId.toString())
      .map(accountId => ({ accountId, meanAndStdDeviation: this.meanAndStdDeviation(eras.map(e => e.rpis[accountId] || 0)) }))
      .map(v => ({ accountId: v.accountId, rpiQuality: this.rpiQuality(v.meanAndStdDeviation, ksi)}));
    
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

      const exposure = await mongoMemoize(this.mongo, `erasStakers(${eraNumber}, ${accountId})`, () => this.api.query.staking.erasStakers(eraNumber, accountId));
      const eraReward = await mongoMemoize(this.mongo, `erasValidatorReward(${eraNumber})`, () => this.api.query.staking.erasValidatorReward(eraNumber));
      const eraPrefs = await mongoMemoize(this.mongo, `erasValidatorPrefs(${eraNumber}, ${accountId})`, () => this.api.query.staking.erasValidatorPrefs(eraNumber, accountId));

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