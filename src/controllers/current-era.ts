import { Request, Response } from 'express';
import createSubstrateApi from '../utils/substrate-api';

const currentEraController = async (req: Request, res: Response) => {
  const api = await createSubstrateApi();
  const lastEra = await api.query.staking.currentEra();
  const lastEraNumber = lastEra.unwrapOrDefault().toNumber();
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(lastEraNumber));
}

export default currentEraController;