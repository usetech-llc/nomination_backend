import mongoose from 'mongoose';
// import q from 'q';
// import path from 'path';

interface ISubscribersModelInterface {
    checkSubscription: (accountId: string) => boolean;
    checkSubscriptionCode: (accountId: string) => {
        accountId: string,
        email: string,
    };
    deleteSubscription: (accountId: string) => Promise<void>;
    generateSubscriptionCode: (accountId: string) => {
        subscriptionCode: string;
        unSubscriptionCode: string;
    };
    saveUserSubscription: (accountId: string, email: string) => boolean;
}

const Schema = mongoose.Schema;

const subscriberSchema = new Schema({
    accountId: String,
    email:  String,
    isDeleted: Boolean,
    subscriptionCode: String,
});

const Subscriber = mongoose.model('subscribers', subscriberSchema);

const subscribersModel: ISubscribersModelInterface = {
    checkSubscription: (accountId) => {
        return true;
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
    generateSubscriptionCode: (accountId) => {
        return {
            subscriptionCode: '',
            unSubscriptionCode: '',
        };
    },
    saveUserSubscription: (accountId, email) => {
        return true;
    },
};

export default subscribersModel;
