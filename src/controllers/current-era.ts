import { Request, Response } from 'express';
import usingApi from '../utils/using-api';
import promisifySubstrate from '../utils/promisify-substrate';

const currentEraController = async (req: Request, res: Response) => {
  await usingApi(async api => {
    const lastEra = await promisifySubstrate(api, () => api.query.staking.currentEra())();
    const lastEraNumber = lastEra.unwrapOrDefault().toNumber();
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(lastEraNumber));
  });
}

export default currentEraController;