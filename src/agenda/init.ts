import createAgenda from "./create-agenda";
import cluster from "cluster";
import os from "os";

async function spawnJobWorkers(): Promise<void> {
  const agenda = await createAgenda();

  const workers = {};

  const createWorker = () => {
    const id = cluster.fork({agendaJob: true}).id;
    workers[id] = true;
    console.log(`spawned background job worker ${id}`)
  };

  cluster.on('exit', (worker, code, signal) => {
    if(workers[worker.id]) {
      console.log(`background job worker is dead ${worker.id}`)
      delete workers[worker.id];
      createWorker();
    }
  });

  const cpuCount = os.cpus().length;
  for (let i = 0; i < cpuCount; i++) {
    createWorker();
  }
}

async function startJobWorker(): Promise<void> {
  const agenda = await createAgenda();
  async function graceful() {
    console.log('graceful')
    await agenda.stop();
  }
  
  process.on('SIGTERM', graceful);
  process.on('SIGINT' , graceful);
  process.on('exit', graceful);
  process.on('SIGUSR1', graceful);
  process.on('SIGUSR2', graceful);
  process.on('uncaughtException', graceful);

  await agenda.start();

  console.log(`agenda started at ${cluster.worker.id}`)
}

function isJobProcess() {
  return !cluster.isMaster && process.env.agendaJob;
}


export default async function init() {
  if(cluster.isMaster) {
    await spawnJobWorkers();
  }
  if(isJobProcess()) {
    console.log(`worker ${cluster.worker.id} is job worker, starting agenda`)
    await startJobWorker();
  }
}