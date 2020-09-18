import asyncTimeout from "./async-timeout";

export default async function retry<T>(f: () => Promise<T>, retryCount = 100): Promise<T> {
  try {
    return await f();
  }catch(error) {
    if(retryCount < 0) {
      throw error;
    }

    console.log(`Task failed, ${retryCount} attempts remains`, error);
    await asyncTimeout(10000);
    return await retry(f, retryCount - 1);
  }
}