import createSubstrateApi, { reconnectSubstrate } from "./substrate-api";
import { resolve } from "dns";

export default async function retry<T>(f: () => Promise<T>, retryCount = 100): Promise<T> {
  let api = await createSubstrateApi();
  let resolve;
  let reject;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
    f().then(res, err => {
      if(retryCount <= 0) {
        rej(err);
        return;
      }

      retry(f, retryCount - 1)
        .then(res, rej);
    });

  });
  api.on('disconnected', () => {
    reconnectSubstrate()
      .then(_ => {
        if(retryCount < 0) {
          reject('Maximum retry exceeded.');
        }
    
        retry(f, retryCount - 1)
          .then(resolve, reject);
    
      }, reject);
  });

  return promise;
}