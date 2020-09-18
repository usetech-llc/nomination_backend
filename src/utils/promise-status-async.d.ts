declare module "promise-status-async" {
  const PromiseStatuses: {
    PROMISE_REJECTED: string,
    PROMISE_RESOLVED: string,
    PROMISE_PENDING: string
  };

  const PROMISE_REJECTED: string;
  const PROMISE_RESOLVED: string;
  const PROMISE_PENDING: string;

  function promiseStatus(promise: Promise<any>): Promise<string>;
}