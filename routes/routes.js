// fetching all routes files.
const settings = require('../utils/config');
const subscribers = require('../controllers/subscribers');
const substrate = require('../controllers/substrate');
const urlPrefix = settings.urlPrefix;

const routes = function (app) {
    // Initializing routes
    app.get(`${urlPrefix}/health`, substrate.health);
    app.get(`${urlPrefix}/bestvalidators`, substrate.bestValidators);
    app.post(`${urlPrefix}/subscribe/new/:accountId`, subscribers.subscribe);
    app.get(`${urlPrefix}/subscribe/confirm/:code`, subscribers.confirmSubscription);
    app.get(`${urlPrefix}/subscribe/unsubscribe/:code`, subscribers.unsubscribe);

};

module.exports = routes;
