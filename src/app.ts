import bodyParser from 'body-parser';
import express from 'express';
import mongoose from 'mongoose';

import substrate from './controllers/substrate';
import routes from './routes/routes';

const port = 3003;
const app = express();

// connecting to mongoDB
const db = mongoose.connection;
db.on('error', console.error);
db.once('open', () => console.log('database connected'));
mongoose.connect('mongodb://localhost:27017/nomination', { useNewUrlParser: true, useUnifiedTopology: true });

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
