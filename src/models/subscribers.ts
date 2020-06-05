import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import q from 'q';
import settings from '../utils/config';
// import path from 'path';

interface ISubscribersModelInterface {
    checkSubscription: (accountId: string) => Promise<any>;
    checkSubscriptionCode: (accountId: string) => {
        accountId: string,
        email: string,
    };
    deleteSubscription: (accountId: string) => Promise<void>;
    generateSubscriptionCode: (accountId: string, email: string) => Promise<{
        subscriptionCode: string;
        unSubscriptionCode: string;
    }>;
    saveUserSubscription: (accountId: string, email: string) => boolean;
}

const Schema = mongoose.Schema;

const subscriberSchema = new Schema({
    accountId: String,
    dateCreate: { type: Date, default: Date.now },
    email:  String,
    isApproved: Boolean,
    isDeleted: Boolean,
    subscriptionCode: String,
    unSubscriptionCode: String,
});

const Subscriber = mongoose.model('subscribers', subscriberSchema);

const subscribersModel: ISubscribersModelInterface = {
    checkSubscription: async (accountId): Promise<any> => {
        const dbSubscriber = await Subscriber.findOne({ accountId, isApproved: true, isDeleted: false }).exec();
        return !!dbSubscriber;
    },
    checkSubscriptionCode: (accountId) => {
        return {
            accountId: '',
            email: '',
        };
    },
    deleteSubscription: (accountId) => {
      return new Promise(() => null);
    },
    generateSubscriptionCode: async (accountId, email) => {
        const dbSubscriber = await Subscriber.findOne({ accountId, isApproved: false }).exec();
        if (dbSubscriber) {
            return {
                subscriptionCode: dbSubscriber.subscriptionCode,
                unSubscriptionCode: dbSubscriber.unSubscriptionCode,
            };
        }
        const subscriptionCode = jwt.sign({ accountId }, settings.tokenKey);
        const unSubscriptionCode = jwt.sign({ accountId }, settings.tokenKey);
        const newSubscriber = new Subscriber({
            accountId,
            dateCreate: new Date(),
            email,
            isApproved: false,
            isDeleted: false,
            subscriptionCode,
            unSubscriptionCode,
        });
        await newSubscriber.save();
        return {
            subscriptionCode,
            unSubscriptionCode,
        };
    },
    saveUserSubscription: (accountId, email) => {
        return true;
    },
};

export default subscribersModel;
