// fetching all routes files.
import subscribers from '../controllers/subscribers';
import substrate from '../controllers/substrate';
import settings from '../utils/config';

const urlPrefix = settings.urlPrefix;

const routes = (app) => {
    // Initializing routes
    app.get(`${urlPrefix}/health`, substrate.health);
    app.get(`${urlPrefix}/bestvalidators`, substrate.bestValidators);
    app.post(`${urlPrefix}/subscribe/new/:accountId`, subscribers.subscribe);
    app.get(`${urlPrefix}/subscribe/confirm/:code`, subscribers.confirmSubscription);
    app.get(`${urlPrefix}/subscribe/unsubscribe/:code`, subscribers.unsubscribe);
};

export default routes;
