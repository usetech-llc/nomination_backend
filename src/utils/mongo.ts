import { Mongoose, connect, Schema } from "mongoose";
import mongoose from "mongoose";
import config from "../config";

const memoizeSchema = new Schema({
  key: { index: true, type: String },
  value: { type: String }
});

type MemoizedRequest = {
  key: string;
  value: string;
}

export function mongoMemoizeFunction<TArgs extends any[], TResult>(mongo: Mongoose, f: (...args: TArgs) => Promise<TResult>): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs): Promise<TResult> => mongoMemoize(mongo, `${f.name}(${args.join(', ')})`, () => f(...args));
}

const runningGetters: { [key: string]: Promise<any> } = {};

export async function mongoMemoize<T>(mongo: Mongoose, key: string, getter: () => Promise<T>): Promise<T> {
  key = `${config.wsEndpoint} ${key}`;
  const memoizeCollection = mongo.model('MemoizedRequest', memoizeSchema);

  try {
    const memoizedValue = (await memoizeCollection.findOne({ key })).toObject() as MemoizedRequest;
    if(memoizedValue && memoizedValue.value) {
      const value = JSON.parse(memoizedValue.value) as T;
      return value;
    }
  } 
  catch(error){
  }

  const firstGetterCaller = !runningGetters[key];
  if(firstGetterCaller) {
    runningGetters[key] = getter();
  }
  const runningGetter = runningGetters[key];
  const value = await runningGetter;

  if(firstGetterCaller) {
    await new memoizeCollection({
      key: key,
      value: JSON.stringify(value)
    }).save();
    delete runningGetters[key];
  }

  return value;
}

export default function createMongoConnection(): Mongoose {
  return mongoose;
}