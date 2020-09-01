import Substrate from '../utils/substrate.js';
import createSubstrateApi, { reconnectSubstrate } from '../utils/substrate-api.js';
import RpiService from '../rpi-nomination-strategy/rpi-service.js';
import Validator from '../rpi-nomination-strategy/models/validator.js';
import { Request, Response } from 'express';
import createMongoConnection from '../utils/mongo.js';
import retry from '../utils/retry.js';
import config from '../config.js';

interface ISubstrateControllerInterface {
    bestValidators: (req: any, res: any) => void;
    rpiBestValidators: (req: Request, res: Response) => Promise<void>;
    init: () => Promise<any>;
    health: (req: any, res: any) => void;
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
      if (ksi < 0 || ksi > 1) {
        res.sendStatus(402);
        return;
      }

      const api = await createSubstrateApi();
      const lastEra = await api.query.staking.currentEra();
      const lastEraNumber = lastEra.unwrapOrDefault().toNumber();

      try {
        const validators = await retry(async () => {
          const api = await createSubstrateApi();

          const mongo = createMongoConnection();
    
          const service = new RpiService(api, mongo);
      
          return await service.bestValidators(ksi, lastEraNumber);
        });

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(validators.map(v => v.accountId).slice(0, config.validatorsCountInResponse)));
      }
      catch (error) {
        res.sendStatus(500);
      }
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
