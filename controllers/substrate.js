const Substrate = require('../utils/substrate.js');
const sub = new Substrate();
const substrateController = {};

substrateController.init = async function () {
    await sub.init();
    console.log("Connection to substrate initialized");
};

substrateController.health = async function(req, res) {
    const conn = await sub.isConnected();
    let status = {
        connected: conn
    };
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(status));
};

substrateController.bestValidators = async function(req, res) {
    const bestList = sub.getBestValidatorList();
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(bestList));
};

module.exports = substrateController;
