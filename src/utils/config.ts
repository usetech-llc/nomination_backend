const settings = {
    defaultHost: 'https://nomination.usetech.com/',
    smtpHost: process.env.SMTP_HOST,
    smtpPassword: process.env.SMTP_PASSWORD,
    smtpPort: parseInt(process.env.SMTP_PORT, 10),
    smtpUseTLS: process.env.SMTP_USE_TLS === 'true',
    smtpUser: process.env.SMTP_USER,
    urlPrefix: '/api',
};

export default settings;
