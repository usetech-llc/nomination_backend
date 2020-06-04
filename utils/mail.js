const nodemailer = require('nodemailer');
const settings = require('../utils/config');

const mailerUtil = {};

mailerUtil.getMailer = (settings) => {
    if(!settings.smtpHost) return null;
    return nodemailer.createTransport({
        /* host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpUseTLS, */
        service: 'gmail',
        auth: {
            user: settings.smtpUser,
            pass: settings.smtpPassword
        }
    });
};

mailerUtil.sendSubscriptionEmail = (email, subscriptionCode) => {
    let mailer = mailerUtil.getMailer();
    if(!mailer) return false;

    let link = `${settings.defaultHost}/users/confirm/${confirmationCode}`;
    let message = {
        from: settings.smtpUser,
        to: email,
        subject: 'Welcome to Fucent',
        text: `Thanks for registering with us. Activate your account by clicking on this link: ${link} \nSincerely, Fucent team`,
        html: `<p>Thanks for registering with us. Activate your account by clicking on <a href="${link}" target="_blank">this link</a>.</p>\n<p>Sincerely, Fucent team</p>`
    };
    mailer.sendMail(message, function (err) {
        if(err) console.error(err);
    });
};

module.exports = mailerUtil;
