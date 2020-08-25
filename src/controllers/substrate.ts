import Substrate from '../utils/substrate.js';
import createSubstrateApi, { reconnectSubstrate } from '../utils/substrate-api.js';
import RpiService from '../rpi-nomination-strategy/rpi-service.js';
import Validator from '../rpi-nomination-strategy/models/validator.js';
import { Request, Response } from 'express';
import createMongoConnection from '../utils/mongo.js';
import retry from '../utils/retry.js';

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

      const api = await createSubstrateApi();
      const lastEra = await api.query.staking.currentEra();
      const lastEraNumber = lastEra.unwrapOrDefault().toNumber();

      const validators = await retry(async () => {
        try {
          const api = await createSubstrateApi();

          const mongo = createMongoConnection();
    
          const service = new RpiService(api, mongo);
      
          return await service.bestValidators(parseFloat(req.params["ksi"]), lastEraNumber);
        } catch(error) {
          await reconnectSubstrate();
          throw error;
        }
      });

      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(validators));
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
