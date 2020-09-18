import { Request, Response } from 'express';
import SubstrateClient from '../substrate/substrate-client';

const currentEraController = async (req: Request, res: Response) => {
  await SubstrateClient.usingClient(async client => {
    const lastEra = await client.promisifySubstrate(api => api.query.staking.currentEra());
    const lastEraNumber = lastEra.unwrapOrDefault().toNumber();
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(lastEraNumber));
  });
}

export default currentEraController;