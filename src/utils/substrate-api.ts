import { WsProvider, ApiPromise } from "@polkadot/api";
import config from "../config";

export default async function createSubstrateApi(): Promise<ApiPromise> {
    const wsProvider = new WsProvider(config.wsEndpoint);
    const settings = { provider: wsProvider };

    return await new ApiPromise(settings).isReady;
}