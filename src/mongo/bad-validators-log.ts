import { Mongoose, Schema } from "mongoose";

const badValidatorSchema = new Schema({
  validator: { type: String },
  era: { type: Number },
  reason: { type: String }
});

type BadValidator = {
  validator: string,
  era: number,
  reason: string
}

export async function addBadValidator(mongo: Mongoose, validator: BadValidator) {
  const model = mongo.model('BadValidator', badValidatorSchema);
  await new model(validator)
    .save();
}
