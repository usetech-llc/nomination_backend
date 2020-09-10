import { Schema, Mongoose } from "mongoose";

const sortingValidatorsJob = new Schema({
  _id: { type: String },
  progress: { 
    type: {
      current: { type: Number },
      total: { type: Number }
    },
  },
  result: { type: Object },
});

interface SortingValidatorsJobData<TResult> {
  _id: string,
  progress: {
    current: number,
    total: number,
  },
  result?: TResult
}

export async function setJobData<TResult>(mongo: Mongoose, data: SortingValidatorsJobData<TResult>): Promise<void> {
  const model = mongo.model('SortingValidatorsJob', sortingValidatorsJob);
  await model.updateOne({_id: data._id}, data, { upsert: true });
}

export async function getJobData<TResult>(mongo: Mongoose, id: string): Promise<SortingValidatorsJobData<TResult> | undefined> {
  const model = mongo.model('SortingValidatorsJob', sortingValidatorsJob);
  const jobData = await (model.findById(id) as unknown as PromiseLike<SortingValidatorsJobData<TResult>>);
  return jobData && {
    _id: jobData._id,
    progress: jobData.progress,
    result: jobData.result
  };
}