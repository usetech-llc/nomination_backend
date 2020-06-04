const mongoose = require('mongoose');
const q = require('q');
const Schema = mongoose.Schema;
const path = require("path");

const subscriberSchema = new Schema({
    accountId: String,
    email:  String,
    subscriptionCode: String,
    isDeleted: Boolean
});

const Subscriber = mongoose.model('subscribers', subscriberSchema);
const subscribersModel = {};

subscribersModel.checkSubscription = (accountId) => {

};

subscribersModel.generateSubscriptionCode = (accountId) => {

};

subscribersModel.checkSubscriptionCode = (subscriptionCode) => {

};

subscribersModel.saveUserSubscription = (accountId, email) => {

};

subscribersModel.deleteSubscription = (accountId) => {

};

module.exports = subscribersModel;
