import bodyParser from 'body-parser';
import express from 'express';
import mongoose from 'mongoose';

import substrate from './controllers/substrate';
import routes from './routes/routes';
import config from './config';

const port = 3003;
const app = express();

// connecting to mongoDB
const db = mongoose.connection;
db.on('error', console.error);
db.once('open', () => console.log('database connected'));
mongoose.connect(config.mongoConnection, { useNewUrlParser: true, useUnifiedTopology: true, keepAlive: true, poolSize: 30, socketTimeoutMS: 36000, connectTimeoutMS: 36000 });

// Configure content security
const allowedOrigins = ['http://localhost:3000', 'https://nomination.usetech.com'];
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	next();
});

// Initializing routes.
routes(app);

/*
substrate.init().catch(console.error).finally(() => {
	app.listen(port, () => console.log(`App listening on port ${port}!`));
});
*/
app.listen(port, () => console.log(`App listening on port ${port}!`));
