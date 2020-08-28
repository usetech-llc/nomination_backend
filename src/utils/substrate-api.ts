import { WsProvider, ApiPromise } from "@polkadot/api";
import config from "../config";

let api: ApiPromise;
let apiPromise: Promise<ApiPromise>;

export async function reconnectSubstrate(): Promise<void> {
  if(api){
    api.disconnect();
    api = undefined;
  }
  if(apiPromise) {
    await apiPromise;
  }

  const wsProvider = new WsProvider(config.wsEndpoint);
  const settings = { provider: wsProvider };

  apiPromise = new ApiPromise(settings).isReady;
  api = await apiPromise;
  apiPromise = undefined;
}

export default async function createSubstrateApi(): Promise<ApiPromise> {
    if(!api) {
      await reconnectSubstrate();
    }

    return api;
}