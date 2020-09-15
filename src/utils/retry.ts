import createSubstrateApi from "./using-api";
import { resolve } from "dns";

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function retry<T>(f: () => Promise<T>, retryCount = 100): Promise<T> {
  try {
    return await f();
  }catch(error) {
    if(retryCount < 0) {
      throw error;
    }

    await timeout(10000);
    return await retry(f, retryCount - 1);
  }
}