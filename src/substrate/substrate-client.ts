import { ApiPromise, WsProvider } from "@polkadot/api";
import config from "../config";
import {promiseStatus, PROMISE_REJECTED} from "promise-status-async";
import asyncTimeout from "../utils/async-timeout";


type PromiseType<T> = T extends PromiseLike<infer TInner> ? TInner : T;

type TailParams<T> = T extends (api: ApiPromise, ...rest: infer R) => any ? R : never;

export default class SubstrateClient {
  private static lastCreatedApi: ApiPromise;

  private constructor(private api: ApiPromise) {
  }

  public async promisifySubstrate<T extends (api: ApiPromise) => any>(action: T): Promise<PromiseType<ReturnType<T>>> {
    const promise = new Promise<PromiseType<ReturnType<T>>>((resolve, reject) => {
      const cleanup = () => {
        this.api.off('disconnected', fail);
        this.api.off('error', fail);
        resolve = undefined;
        reject = undefined;
      };

      const success = (r: any) => {
        resolve && resolve(r);
        cleanup();
      };
      const fail = (error: any) => {
        reject && reject(error);
        cleanup();
      };

      this.api.on('disconnected', fail);
      this.api.on('error', fail);

      this.api.isReady.then(
        () => {
          const result = action(this.api);
          Promise.resolve(result)
            .then(success, fail);
        }, fail);
      
      const healthCheck = async () => {
        try {
          await this.api.isReady;
          const health = this.api.rpc.system.health();
          let delayWaited = false;
          const delay = (async () => {
            await asyncTimeout(60000);
            delayWaited = true;
          })();

          await Promise.race([health, delay]);

          if(delayWaited) {
            if(this.api === SubstrateClient.lastCreatedApi) {
              SubstrateClient.newApi();
            }
            fail({error: 'health check hangs for too long time'});
            return;
          }
        }catch(error) {
          fail(error);
          return;
        }

        setTimeout(healthCheck, 60000);
      };

      healthCheck();
    });
    return promise as any;
  }

  static newApi(): void {
    console.log('SubstrateClient.newApi.');
    const wsProvider = new WsProvider(config.wsEndpoint);
    const settings = { provider: wsProvider };

    SubstrateClient.lastCreatedApi = new ApiPromise(settings);

    const thisApi = SubstrateClient.lastCreatedApi;

    const reconnect = async () => {
      await asyncTimeout(10000);
      if (thisApi !== SubstrateClient.lastCreatedApi) {
        console.log(`SubstrateClient.usingClient: reconnect was called, but for different api`);
        return;
      }
      console.log(`SubstrateClient.usingClient: reconnecting api`);
      try {
        SubstrateClient.lastCreatedApi.disconnect();
      } catch (error) {

      }
      SubstrateClient.newApi();
    }

    thisApi.on('disconnected', reconnect);
  }

  public static async usingClient<T>(action: (client: SubstrateClient) => Promise<T>): Promise<T> {
    let resultReject: (error: any) => void | undefined = undefined;
    let resultResolve: (r: T) => void | undefined = undefined;

    const result = new Promise<T>((resolve, reject) => {
      resultResolve = resolve;
      resultReject = reject;
    });

    if (!SubstrateClient.lastCreatedApi || await promiseStatus(SubstrateClient.lastCreatedApi.isReady) === PROMISE_REJECTED) {
      this.newApi();
    }


    const cleanup = () => {
      console.log(`SubstrateClient.usingClient: cleanup`);
      SubstrateClient.lastCreatedApi.off('error', onError);
      SubstrateClient.lastCreatedApi.off('disconnected', onDisconnet);
      resultReject = undefined;
      resultResolve = undefined;
    };

    const fail = (error: any) => {
      resultReject && resultReject(error);
      cleanup();
    };

    const success = (r: T) => {
      resultResolve && resultResolve(r);
      cleanup();
    };

    const onError = (error) => {
      console.log('SubstrateClient.usingClient: substrate api error', error);
      fail(error);
    };

    const onDisconnet = (error) => {
      console.log('SubstrateClient.usingClient: substrate api disconnected', error);
      fail(error);
    };

    SubstrateClient.lastCreatedApi.on('error', onError);
    SubstrateClient.lastCreatedApi.on('disconnected', onDisconnet);

    action(new SubstrateClient(SubstrateClient.lastCreatedApi))
      .then(success, fail);

    return result;
  }

  public static async warmup(): Promise<void> {
    await SubstrateClient.usingClient(async client => {
      await client.api.isReady;
    });
  }
}