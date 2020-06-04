const bodyParser = require('body-parser')
const express = require('express');
const substrate = require('./controllers/substrate');
const mongoose = require('mongoose');
const routes = require('./routes/routes');
const port = 3003;
const app = express();

//conneсting to mongoDB
const db = mongoose.connection;
db.on('error', console.error);
db.once('open', function() {
	console.log('database connected');
});
mongoose.connect('mongodb://localhost:27017/nomination', { useNewUrlParser: true, useUnifiedTopology: true });

// Configure content security
const allowedOrigins = ['http://localhost:3000', 'https://nomination.usetech.com'];

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

// Initializing routes.
routes(app);


substrate.init().catch(console.error).finally(() => {
	app.listen(port, () => console.log(`App listening on port ${port}!`));
});
