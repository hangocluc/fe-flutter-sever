function getMailConfig() {
    const user = process.env.SMTP_USER || process.env.GMAIL_USER || ''
    const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || ''

    return {
        enabled: Boolean(user && pass),
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
        from: process.env.SMTP_FROM || user,
    }
}

module.exports = { getMailConfig }
