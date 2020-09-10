import { Mongoose } from "mongoose";
import mongoose from "mongoose";
import config from "../config";


// connecting to mongoDB
const db = mongoose.connection;
db.on('error', console.error);
db.once('open', () => console.log('database connected'));
mongoose.connect(config.mongoConnection, { useNewUrlParser: true, useUnifiedTopology: true, keepAlive: true, poolSize: 30, socketTimeoutMS: 36000, connectTimeoutMS: 36000 });

export default function createMongoConnection(): Mongoose {
  return mongoose;
}