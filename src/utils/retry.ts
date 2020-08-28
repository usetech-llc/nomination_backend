export default async function retry<T>(f: () => Promise<T>, retryCount = 100): Promise<T> {
  try {
    return await f();
  } catch(error) {
    if(retryCount <= 0) {
      throw error;
    }

    return retry(f, retryCount - 1);
  }
}