import bodyParser from 'body-parser';
import express from 'express';
import swaggerUi from 'swagger-ui-express';

import routes from './routes/routes';
import yamljs from 'yamljs';
import createAgenda from './agenda/create-agenda';
import initAgenda from './agenda/init';
import Agendash from 'agendash';
import cluster from 'cluster';


process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

console.log(`started ${cluster.isMaster ? 'master' : cluster.worker.id}`);

async function initWebServer() {
  const port = 3003;
  const app = express();
  
    // Configure content security
  const allowedOrigins = ['http://localhost:3000', 'https://nomination.usetech.com'];
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  const swagger = yamljs.load('./swagger.yaml');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swagger));

  const agenda = await createAgenda();
  app.use('/dash', Agendash(agenda));

  // Initializing routes.
  routes(app);

  app.listen(port, () => console.log(`App listening on port ${port}!`));
}

async function init() {
  if(cluster.isMaster) {
    await initWebServer();
  }

  await initAgenda();
}

init();
