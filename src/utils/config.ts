const settings = {
    defaultHost: 'https://nomination.usetech.com/',
    smtpHost: process.env.SMTP_HOST,
    smtpPassword: '', // process.env.SMTP_PASSWORD,
    smtpPort: parseInt(process.env.SMTP_PORT, 10),
    smtpUseTLS: process.env.SMTP_USE_TLS === 'true',
    smtpUser: '', // process.env.SMTP_USER,
    tokenKey: '23c3-3c4d-32fh-2g5h',
    urlPrefix: '/api/v2',
};

export default settings;
