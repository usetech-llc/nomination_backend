import { Request, Response } from 'express';
import { parseQueryInt } from '../utils/request-parser';
import { RpiMongoNames } from '../models/rpi-mongo-names';
import createMongoConnection from '../mongo/mongo';
import RpiService from '../rpi-nomination-strategy/rpi-service';
import { readMemoized, mongoMemoize } from '../mongo/memoized-requests';
import usingApi from '../utils/using-api';


interface MemoizedRpiRequest {
  name: RpiMongoNames,
  era: number,
  eraRange: number,
  accountId: string
}

function makeCall(service: RpiService, request: MemoizedRpiRequest, materializer: (call: any) => Promise<any>) {
  if(!request.eraRange || request.eraRange < 0) {
    throw 'eraRange must be a positive integer.';
  }
  const makeCallInfoes: any[] = (() => {
    const eras = new Array(request.eraRange).fill(0).map((_, i) => request.era - i);
    switch(request.name) {
      case RpiMongoNames.electedInfo:
        return eras.map(e => service.electedInfoCall(e));
      case RpiMongoNames.erasStakers:
        return eras.map(e => service.erasStakersCall(e, request.accountId));
      case RpiMongoNames.erasValidatorPrefs:
        return eras.map(e => service.erasValidatorPrefsCall(e, request.accountId));
      case RpiMongoNames.erasValidatorReward:
        return eras.map(e => service.erasValidatorRewardCall(e));
      case RpiMongoNames.loadEra: {
        
        return eras.map(async e => {
          const electedInfo = await materializer(service.electedInfoCall(e));
          if(!electedInfo) {
            return undefined;
          }

          return service.loadEraCall(e, electedInfo);
        });
      }
    
      default: throw `unknown mongo cache name ${request.name}`;
    }
  })();

  return Promise.all(makeCallInfoes.map(materializer));
}

const mongoController = {
  memoizedRpiRequests: async (req: Request, res: Response) => {
    req.setTimeout(1000*60*60*5);
    
    const name = req.param('name') as RpiMongoNames;
    const era: number = parseQueryInt(req, 'era');
    const eraRange: number = parseQueryInt(req, 'eraRange');
    const accountId: string = req.query['accountId'] as string;
    const cacheOnly: boolean = req.query['cacheOnly'] === 'true';

    await usingApi(async api => {
      const mongo = createMongoConnection();

      const rpiService = new RpiService(api, mongo);
  
      const r: MemoizedRpiRequest = {
        accountId,
        era,
        eraRange,
        name
      };
      const callResult = await makeCall(rpiService, r, (call) => cacheOnly ? readMemoized(mongo, call) : mongoMemoize(mongo, call));
      res.setHeader('Content-disposition',`attachment; filename=${name}_${era}_${eraRange}_${accountId}`);
      res.send(JSON.stringify(callResult));
    });
  },
}

export default mongoController;