import Agenda from "agenda";
import config from "../config";
import * as cachingEras from "./jobs/caching-eras";
import * as sortingValidators from "./jobs/sorting-validators";


const connectionOpts: Agenda.AgendaConfiguration = {db: {address: config.mongoConnection, collection: 'agendaJobs', options: { useNewUrlParser: true, useUnifiedTopology: true, keepAlive: true, poolSize: 30, socketTimeoutMS: 36000, connectTimeoutMS: 36000 }}};

const agenda = new Agenda(connectionOpts);

let resolve: undefined | ((a: Agenda) => void) = undefined;
let reject: undefined | ((reason: any) => void) = undefined;
let agendaPromise = new Promise<Agenda>((res, rej) => {
  resolve = res;
  reject = rej;
});

function defineJobs() {
    //cachingEras.defineJob(agenda);
    sortingValidators.defineJob(agenda);
}

agenda.on('ready', async () => {
  try {
    defineJobs();

    agendaPromise = undefined;
    resolve(agenda);
  }
  catch(e){
    reject(e);
  }
});

export default async function createAgenda(): Promise<Agenda> {
  if(!agendaPromise) {
    return agenda;
  }

  return await agendaPromise;
};
