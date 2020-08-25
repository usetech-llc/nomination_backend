import { WsProvider, ApiPromise } from "@polkadot/api";
import config from "../config";

let api: ApiPromise;

export async function reconnectSubstrate(): Promise<void> {
  if(api){
    api = api.clone();
    return;
  }
  const wsProvider = new WsProvider(config.wsEndpoint);
  const settings = { provider: wsProvider };

  api = await new ApiPromise(settings).isReady;
}

export default async function createSubstrateApi(): Promise<ApiPromise> {
    if(!api) {
      await reconnectSubstrate();
    }

    return api;
}