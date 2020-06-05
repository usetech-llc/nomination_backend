import nodemailer from 'nodemailer';
import settings from '../utils/config';

const mailerUtil = {
    getMailer: (options?: any) => {
        if (!options.smtpHost) {
            return null;
        }
        return nodemailer.createTransport({
            auth: {
                pass: options.smtpPassword,
                user: options.smtpUser,
            },
            /* host: settings.smtpHost,
            port: settings.smtpPort,
            secure: settings.smtpUseTLS, */
            service: 'gmail',
        });
    },
    sendSubscriptionEmail: (email, subscriptionCode) => {
        const mailer = mailerUtil.getMailer();
        if (!mailer) { return false; }

        const link = `${settings.defaultHost}/users/confirm/${subscriptionCode}`;
        const message = {
            from: settings.smtpUser,
            html: `<p>
Thanks for registering with us. Activate your account by clicking on <a href="${link}" target="_blank">
this link</a>.
</p>\n<p>Sincerely, Fucent team</p>`,
            subject: 'Welcome to Fucent',
            text: `Thanks for registering with us.
Activate your account by clicking on this link: ${link} \nSincerely, Fucent team`,
            to: email,
        };
        mailer.sendMail(message, (err) => {
            if (err) { console.error(err); }
        });
    },
};

export default mailerUtil;
