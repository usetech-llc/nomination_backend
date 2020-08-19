// fetching all routes files.
import subscribers from '../controllers/subscribers';
import substrate from '../controllers/substrate';
import settings from '../utils/config';
import {Express} from 'express';

const urlPrefix = settings.urlPrefix;

const routes = (app: Express) => {
    // Initializing routes
    app.get(`${urlPrefix}/health`, substrate.health);
    app.get(`${urlPrefix}/bestvalidators`, substrate.bestValidators);
    app.get(`${urlPrefix}/rpi/bestvalidators/:ksi`, substrate.rpiBestValidators);
    app.post(`${urlPrefix}/subscribe/new/:accountId`, subscribers.subscribe);
    app.get(`${urlPrefix}/subscribe/confirm/:code`, subscribers.confirmSubscription);
    app.get(`${urlPrefix}/subscribe/unsubscribe/:code`, subscribers.unsubscribe);
};

export default routes;
