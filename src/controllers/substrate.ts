import Substrate from '../utils/substrate.js';
import createSubstrateApi, { reconnectSubstrate } from '../utils/substrate-api.js';
import RpiService from '../rpi-nomination-strategy/rpi-service.js';
import Validator from '../rpi-nomination-strategy/models/validator.js';
import { Request, Response } from 'express';
import createMongoConnection from '../mongo/mongo.js';
import retry from '../utils/retry.js';
import config from '../config.js';
import * as sortingValidatorsJob from '../agenda/jobs/sorting-validators';
import createAgenda from '../agenda/create-agenda.js';
import { async } from 'q';
import { getJobData } from '../mongo/sorting-validators-job.js';

interface ISubstrateControllerInterface {
    bestValidators: (req: any, res: any) => void;
    rpiBestValidators: (req: Request, res: Response) => Promise<void>;
    rpiBestValidatorsJob: (req: Request, res: Response) => Promise<void>;
    init: () => Promise<any>;
    health: (req: any, res: any) => void;
}

interface RpiBestValidatorsResponse {
  validators: string[],
  jobId: string
}

function cutValidatorsResponse(validators: Validator[]): string[] {
  return validators.map(v => v.accountId).slice(0, config.validatorsCountInResponse);
}

async function getValidators(ksi: number, era: number): Promise<RpiBestValidatorsResponse> {
  return await retry(async () => {
    const api = await createSubstrateApi();
    const mongo = createMongoConnection();

    const service = new RpiService(api, mongo);
    
    if(!await service.areBestValidatorsMemoized(era)) {
      const jobId = await sortingValidatorsJob.now(await createAgenda(), { ksi, era: era })
      return {
        validators: undefined,
        jobId
      }
    }
    const validators = await service.bestValidators(ksi, era);
    return {
      validators: cutValidatorsResponse(validators),
      jobId: undefined
    };
  });
}

const sub = new Substrate();
const substrateController: ISubstrateControllerInterface = {
    bestValidators: async (req, res) => {
        const bestList = sub.getBestValidatorList();
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(bestList));
    },
    rpiBestValidators: async (req: Request, res: Response) => {
      req.setTimeout(1000*60*60*5);
      const ksi = parseFloat(req.query['ksi'] as string);
      if (isNaN(ksi) || ksi < 0 || ksi > 1) {
        res.sendStatus(400);
        return;
      }

      const api = await createSubstrateApi();
      const lastEra = await api.query.staking.currentEra();
      const lastEraNumber = lastEra.unwrapOrDefault().toNumber();

      try {
        const response = await getValidators(ksi, lastEraNumber);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(response));
      }
      catch (error) {
        res.sendStatus(500);
      }
    },
    rpiBestValidatorsJob: async(req: Request, res: Response) => {
      const id = req.param('id') as string;
      const agenda = await createAgenda();
      const mongo = createMongoConnection();

      const [job, extraData] = await Promise.all([sortingValidatorsJob.getJob(agenda, id), getJobData<Validator[]>(mongo, id)]);
      const cutValidators = extraData && extraData.result && cutValidatorsResponse(extraData.result);
      const cutExtraData = extraData && {...extraData, result: cutValidators};
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({job, extraData: cutExtraData}));
    },
    health: async (req, res) => {
        const conn = await sub.isConnected();
        const status = {
            connected: conn,
        };
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(status));
    },
    init: async () => {
        await sub.init();
        console.log('Connection to substrate initialized');
    },
};

export default substrateController;
