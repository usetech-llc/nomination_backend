import Agenda from "agenda";
import createMongoConnection from "../../mongo/mongo";
import createSubstrateApi from "../../utils/substrate-api";
import retry from "../../utils/retry";
import RpiService from "../../rpi-nomination-strategy/rpi-service";
import { mongoMemoize } from "../../mongo/memoized-requests";
import JobNames from "./job-names";

async function doJob(job: Agenda.Job<{}>) {

  await retry(async() => {
    const mongo = createMongoConnection();
    const api = await createSubstrateApi();

    const lastEra = await api.query.staking.currentEra();
    const lastEraNumber = lastEra.unwrapOrDefault().toNumber();

    const service = new RpiService(api, mongo);
    const electedCall = service.electedInfoCall(lastEraNumber);

    const elected = await mongoMemoize(mongo, electedCall);
    const eras = service.erasRange(lastEraNumber);
    
    for(let i = 0; i < eras.length; i++) {
      await mongoMemoize(mongo, service.loadEraCall(eras[i], elected));
    }
  });
}

export function defineJob(agenda: Agenda) {
  agenda.define(JobNames.CachingEras, { concurrency: 1 }, doJob)

  agenda.every('30 minutes', JobNames.CachingEras);
}