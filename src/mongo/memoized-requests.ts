import { Mongoose, connect, Schema, Model, Document } from "mongoose";
import config from "../config";
import { RpiMongoNames } from "../models/rpi-mongo-names";


const memoizeSchema = new Schema({
  key: { index: true, type: String },
  value: { type: String }
});

type MemoizedRequest = {
  key: string;
  value: string;
}

export interface MemoizedCallInfo<TParam, TResult> {
  params: TParam,
  name: RpiMongoNames,
  call: () => Promise<TResult>
}

function makeMemoizeKey(name: RpiMongoNames, params: any): string {
  return `${config.wsEndpoint} ${name}(${JSON.stringify(params)})`;
}

const runningGetters: { [key: string]: Promise<any> } = {};

function memoizedRequestModel(mongo: Mongoose): Model<Document, {}> {
  return mongo.model('MemoizedRequest', memoizeSchema);
}

async function readMemoizedValue<T>(mongo: Mongoose, key: string): Promise<T> {
  const memoizeCollection = memoizedRequestModel(mongo);

  try {
    const memoizedValue = (await memoizeCollection.findOne({ key })).toObject() as MemoizedRequest;
    if(memoizedValue && memoizedValue.value) {
      const value = JSON.parse(memoizedValue.value) as T;
      return value;
    }
  } 
  catch(error){
  }

  return undefined;
}

export function readMemoized<TParam, TResult>(mongo: Mongoose, call: MemoizedCallInfo<TParam, TResult>): Promise<TResult> {
  const key = makeMemoizeKey(call.name, call.params);
  return readMemoizedValue(mongo, key);
}

export async function mongoMemoize<TParam, TResult>(mongo: Mongoose, call: MemoizedCallInfo<TParam, TResult>): Promise<TResult> {
  const key = makeMemoizeKey(call.name, call.params);
  const memoizedValue = await readMemoizedValue<TResult>(mongo, key);
  if(memoizedValue) {
    return memoizedValue;
  }

  const firstGetterCaller = !runningGetters[key];
  if(firstGetterCaller) {
    runningGetters[key] = call.call();
  }
  const runningGetter = runningGetters[key];
  const value = await runningGetter;

  if(firstGetterCaller) {
    const memoizeCollection = memoizedRequestModel(mongo);
    await new memoizeCollection({
      key: key,
      value: JSON.stringify(value)
    }).save();
    delete runningGetters[key];
  }

  return value;
}