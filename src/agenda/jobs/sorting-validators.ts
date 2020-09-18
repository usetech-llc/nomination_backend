import Agenda from "agenda";
import { v4 } from "uuid";
import retry from "../../utils/retry";
import RpiService from "../../rpi-nomination-strategy/rpi-service";
import createMongoConnection from "../../mongo/mongo";
import * as jobDb from "../../mongo/sorting-validators-job";
import JobNames from "./job-names";
import SubstrateClient from "../../substrate/substrate-client";

export interface JobData {
  ksi: number,
  era: number,
  id: string
}

async function doJob(job: Agenda.Job<JobData>) {
  console.log(`running sorting validators job ${job.attrs.data.id}`)

  await retry(async () => {
    const mongo = createMongoConnection();
    await SubstrateClient.usingClient(async client => {
      const service = new RpiService(client, mongo);

      await jobDb.setJobData(mongo, {
        _id: job.attrs.data.id,
        progress: {
          current: 0,
          total: 0
        }
      });
  
      let progress: {current: number, total: number} = undefined;
      const validators = await service.bestValidators(job.attrs.data.ksi, job.attrs.data.era, async ({current, total}) => {
        progress = {
          current,
          total
        };
        console.log(`sorting validators job ${job.attrs.data.id} progress: ${current}/${total}`);
        await jobDb.setJobData(mongo, { _id: job.attrs.data.id, progress });
      });
      await jobDb.setJobData(mongo, {
        _id: job.attrs.data.id,
        progress,
        result: validators
      });
    });
  });
}

export function defineJob(agenda: Agenda) {
  agenda.define(JobNames.SortingValidators, { concurrency: 1 }, doJob)
}

export async function now(agenda: Agenda, data: Omit<JobData, 'id'>): Promise<string> {
  const id = v4();
  console.log(`scheduling sorting validators job ${id}`)
  await agenda.now(JobNames.SortingValidators, {...data, id});
  return id;
}

export async function getJob(agenda: Agenda, id: string): Promise<Agenda.Job> {
  const jobs = await agenda.jobs({ name: JobNames.SortingValidators, "data.id": id });
  return jobs && jobs[0];
}