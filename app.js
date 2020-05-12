const bodyParser = require('body-parser')
const express = require('express');
const Substrate = require('./utils/substrate.js');

const port = 3003;
const app = express();

const sub = new Substrate();

app.get('/health', async function (req, res) {

	const conn = await sub.isConnected();
	let status = {
		connected: conn
	};

	res.send(JSON.stringify(status));
});

app.get('/bestvalidators', function (req, res) {
	const bestList = sub.getBestValidatorList();
	res.send(JSON.stringify(bestList));
});

async function init() {
	await sub.init();
	console.log("Connection to substrate initialized");
}
init().catch(console.error).finally(() => {
	app.listen(port, () => console.log(`App listening on port ${port}!`));
});
