import subscribersModel from '../models/subscribers';
import mailerUtil from '../utils/mail';

interface ISubscribersInterface {
    subscribe: (req: any, res: any) => void;
    confirmSubscription: (req: any, res: any) => void;
    unsubscribe: (req: any, res: any) => void;
}

interface IResponseInterface {
    data?: any;
    status?: string;
}

const subscribers = {
    // confirmSubscription - get subscription code, check it and save success subscription into db
    confirmSubscription: async (req, res) => {
        const subscriptionCode = req.query.code;
        const response: IResponseInterface = {};
        if (!subscriptionCode) {
            res.status(400);
            response.data = {
                message: 'Subscription code not provided',
            };
            res.send(response);
            return;
        }
        const userData = subscribersModel.checkSubscriptionCode(subscriptionCode);
        if (!userData) {
            res.status(400);
            response.data = {
                message: 'Cannot decode subscription code',
            };
            res.send(response);
            return;
        }
        const subscriptionSaved = await subscribersModel.saveUserSubscription(userData.accountId, userData.email);
        if (subscriptionSaved) {
            response.status = 'success';
            response.data = {
                message: 'User successfully subscribed',
            };
            res.send(response);
        } else {
            res.status(400);
            response.data = {
                message: `Cannot save user subscription ${subscriptionCode}`,
            };
            res.send(response);
        }
    },
    // subscribe users - generate subscription code, save it into db and send it to email
    subscribe: async (req, res) => {
        const response: IResponseInterface = {};
        try {
            const accountId = req.params.accountId;
            const { email } = req.body;
            console.log('email', email, 'accountId', accountId);
            if (!email) {
                res.status(400);
                res.send('Email address not provided');
                return;
            }
            // check if we already have subscription for this account
            // если есть - отвечаем, что есть
            const isSubscribed = await subscribersModel.checkSubscription(accountId);
            if (isSubscribed) {
                response.status = 'success';
                response.data = {
                    message: 'You have already subscribed',
                };
                res.send(response);
                return;
            }
            const currentSubscription = await subscribersModel.generateSubscriptionCode(accountId, email);
            console.log('currentSubscription', currentSubscription);
            const sendEmailStatus =
              await mailerUtil.sendSubscriptionEmail(
                email,
                currentSubscription.subscriptionCode,
              );
            if (sendEmailStatus) {
                response.status = 'success';
                response.data = {
                    message: 'Notification email successfully sent',
                };
                res.send(response);
                return;
            }

            res.status(400);
            response.data = {
                message: 'Cannot send email',
            };
            res.send(response);
        } catch (e) {
            console.log('error', e);
            res.status(400);
            response.data = e;
            res.send(response);
        }
    },
    // subscribe users - generate subscription key, save it into db and send it to email
    unsubscribe: async (req, res) => {
        // “Thank you, your subscription has been cancelled”
        const unsubscriptionCode = req.query.code;
        const response: IResponseInterface = {};
        const userData = subscribersModel.checkSubscriptionCode(unsubscriptionCode);
        if (!userData) {
            res.status(400);
            response.data = {
                message: 'Cannot decode subscription code',
            };
            res.send(response);
            return;
        }
        subscribersModel.deleteSubscription(userData.accountId).then(() => {
            response.status = 'success';
            response.data = {
                message: 'User successfully unsubscribed',
            };
            res.send(response);
        }, (err) => {
            res.status(400);
            res.send(err);
        });
    },
};

export default subscribers;
