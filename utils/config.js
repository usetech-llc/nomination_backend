const settings = {
    defaultHost: 'https://nomination.usetech.com/',
    urlPrefix: '/api',
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT),
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    smtpUseTLS: process.env.SMTP_USE_TLS === 'true',
};

module.exports = settings;
