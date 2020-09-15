import { WsProvider, ApiPromise } from "@polkadot/api";
import config from "../config";
import { async, reject } from "q";

let api: ApiPromise | undefined = undefined;


export default function usingApi<T>(action: (api: ApiPromise) => Promise<T>): Promise<T> {
  let resultReject: (error: any) => void | undefined = undefined;
  let resultResolve: (r: T) => void | undefined = undefined;

  const result = new Promise<T>((resolve, reject) => {
    resultResolve = resolve;
    resultReject = reject;
  });

  const wsProvider = new WsProvider(config.wsEndpoint);
  const settings = { provider: wsProvider };

  let api = new ApiPromise(settings);

  const cleanup = () => {
    try {
      api && api.disconnect();
    }catch(error) {

    }

    api && api.off('error', onError);
    api && api.off('disconnected', onDisconnet);
    api = undefined;
  };

  const fail = (error: any) => {
    cleanup();
    resultReject && resultReject(error);
    resultReject = undefined;
    resultResolve = undefined;
  };

  const success = (r: T) => {
    cleanup();
    resultResolve && resultResolve(r);
    resultReject = undefined;
    resultResolve = undefined;
  };

  const onError = (error) => {
    console.log('substrate api error', error);
    fail(error);
  };

  const onDisconnet = (error) => {
    console.log('substrate api disconnected', error);
    fail(error);
  };

  api.on('error', onError);
  api.on('disconnected', onDisconnet);

  (async () => {
    await api.isReady;
    return await action(api);
  })().then(success, fail);

  return result;
}