// fetching all routes files.
import subscribers from '../controllers/subscribers';
import substrate from '../controllers/substrate';
import settings from '../utils/config';
import {Express} from 'express';
import mongoController from '../controllers/mongo';
import currentEraController from '../controllers/current-era';

const urlPrefix = settings.urlPrefix;

const routes = (app: Express) => {
    // Initializing routes
    app.get(`${urlPrefix}/health`, substrate.health);
    app.get(`${urlPrefix}/bestvalidators`, substrate.bestValidators);
    app.get(`${urlPrefix}/rpi/bestvalidators`, substrate.rpiBestValidators);
    app.get(`${urlPrefix}/rpi/background-jobs/:id`, substrate.rpiBestValidatorsJob);

    app.post(`${urlPrefix}/subscribe/new/:accountId`, subscribers.subscribe);
    app.get(`${urlPrefix}/subscribe/confirm/:code`, subscribers.confirmSubscription);
    app.get(`${urlPrefix}/subscribe/unsubscribe/:code`, subscribers.unsubscribe);

    app.get(`${urlPrefix}/mongo/memoized-rpi-requests/:name`, mongoController.memoizedRpiRequests);
    
    app.get(`${urlPrefix}/current-era`, currentEraController);
};

export default routes;
