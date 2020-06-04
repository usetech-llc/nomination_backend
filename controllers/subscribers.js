// const subscriberModel = require('../models/subscribers');
const mailerUtil = require('../utils/mail');

const subscribers = {};

// subscribe users - generate subscription code, save it into db and send it to email
subscribers.subscribe = async (req, res) => {
    const accountId = req.query.accountId;
    const { emailAddress } = req.body;
    if (!emailAddress) {
        res.status(400);
        res.send('Email address not provided');
    }
    // check if we already have subscription for this account
    // если есть - отвечаем, что есть
    const isSubscribed = await subscriptionModel.checkSubscription(accountId);
    const response = {};
    if (isSubscribed) {
        response.status = 'success';
        response.data = {
            message: 'You have already subscribed'
        };
        res.send(response);
    }
    const currentSubscription = await subscriptionModel.generateSubscriptionCode(accountId);
    const sendEmailStatus = await mailerUtil.sendSubscriptionEmail(emailAddress, currentSubscription.subscriptionCode);
    if (sendEmailStatus) {
        response.status = 'success';
        response.data = {
            message: 'Notification email successfully sent'
        };
        res.send(response);
        return;
    }

    res.status(400);
    response.data = {
        message: 'Cannot send email'
    };
    res.send(response);
};

// confirmSubscription - get subscription code, check it and save success subscription into db
subscribers.confirmSubscription = async (req, res) => {
    const subscriptionCode = req.query.code;
    const response = {};
    if (!subscriptionCode) {
        res.status(400);
        response.data = {
            message: 'Subscription code not provided'
        };
        res.send(response);
        return;
    }
    const userData = subscriptionModel.checkSubscriptionCode(subscriptionCode);
    if (!userData) {
        res.status(400);
        response.data = {
            message: 'Cannot decode subscription code'
        };
        res.send(response);
        return;
    }
    const subscriptionSaved = await subscriptionModel.saveUserSubscription(userData.accountId, userData.email);
    if (subscriptionSaved) {
        response.status = 'success';
        response.data = {
            message: 'User successfully subscribed'
        };
        res.send(response);
    } else {
        res.status(400);
        response.data = {
            message: `Cannot save user subscription ${subscriptionCode}`
        };
        res.send(response);
    }
};

// subscribe users - generate subscription key, save it into db and send it to email
subscribers.unsubscribe = async (req, res) => {
    const unsubscriptionCode = req.query.code;
    const response = {};
    const userData = subscriptionModel.checkSubscriptionCode(unsubscriptionCode);
    if (!userData) {
        res.status(400);
        response.data = {
            message: 'Cannot decode subscription code'
        };
        res.send(response);
        return;
    }
    subscriptionModel.deleteSubscription(userData.accountId).then(() => {
        response.status = 'success';
        response.data = {
            message: 'User successfully unsubscribed'
        };
        res.send(response);
    }, (err) => {
        res.status(400);
        res.send(err);
    });
};

module.exports = subscribers;

