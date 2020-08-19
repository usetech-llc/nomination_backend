import Validator from "./models/validator";
import config from "../config";
import { ApiPromise } from "@polkadot/api";
import Era from "./models/era";
import { DeriveStakingElected } from "@polkadot/api-derive/staking/types";
import Rpi from "./models/rpi";
import BN from "bn.js";

class RpiService {

    constructor(private api: ApiPromise) {
    }

    public async bestValidators(ksi: number): Promise<Validator[]> {
        const [lastEra, electedInfo] = await Promise.all([
            this.api.query.staking.currentEra(), 
            this.api.derive.staking.electedInfo()
        ]);

        const lastEraNumber = lastEra.unwrapOrDefault().toNumber();

        const eraNumbers = new Array(config.erasRange).fill(0).map((_, index) => lastEraNumber - index).filter(v => v >= 0);

        const eras = await Promise.all(eraNumbers.map(e => this.loadEra(e, electedInfo)));

        const validators: Validator[] = electedInfo
            .info.map(i => i.accountId.toString())
            .map(accountId => ({ accountId, meanAndStdDeviation: this.meanAndStdDeviation(eras.map(e => e.rpis[accountId] || 0))}) )
            .map(v => ({ accountId: v.accountId, rpiQuality: this.rpiQuality(v.meanAndStdDeviation, ksi)}));

        return validators.sort((a, b) => a.rpiQuality - b.rpiQuality);
    }

    private rpiQuality({mean, stdDeviation}: { mean: number; stdDeviation: number; }, ksi: number): any {
        if(ksi < 0 || ksi > 1) {
            throw `invalid parameter - ksi = ${ksi}`;
        }

        if(0 <= ksi && ksi < 0.5) {
            return (2*(mean - 1)*ksi + 1)/stdDeviation;
        } else {
            const phi = 2*ksi - 2;
            return mean*(phi - phi/stdDeviation + 1);
        }
    }

    private meanAndStdDeviation(array: number[]): { mean: number, stdDeviation: number } {
        let n = 0,
            m = 0,
            s = 0;

        let previousMean = 0;
        array.forEach(x => {
            previousMean = m;
            n++;
            m = m + (x - m)/n;
            s = s + (x - m)*(x - previousMean);
        });

        return {
            mean: m,
            stdDeviation: Math.sqrt(s/(n- 1))
        };
    }

    private async loadEra(eraNumber: number, electedInfo: DeriveStakingElected): Promise<Era> {
        const rpis: { [accountId: string]: Rpi } = {};

        await Promise.all(electedInfo.info.map(async staking => {
            const accountId = staking.accountId;

            const [exposure, eraReward, eraPrefs] = await Promise.call([this.api.query.staking.erasStakers(eraNumber, accountId), 
                this.api.query.staking.erasValidatorReward(eraNumber),
                this.api.query.staking.erasValidatorPrefs(eraNumber, accountId)
            ]);

            const commission = eraPrefs.commission.unwrap().div(new BN(config.permill)).div(new BN(1000));
        
            const totalExposure = exposure.total.toBn();
        
            let rewardPerInvestment = 0;
            if (totalExposure > 0) {
                rewardPerInvestment = eraReward * (1.0 - commission) / totalExposure;
            }
        
            rpis[accountId.toString()] =  rewardPerInvestment;
        }));


        return {
            eraNumber,
            rpis
        };
    }
}

export default RpiService;