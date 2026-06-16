function getMailConfig() {
    const user = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim()
    const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '')
    const isPlaceholder = !user || user === 'your.email@gmail.com' || user.includes('your.email')

    return {
        enabled: Boolean(user && pass && !isPlaceholder),
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
        from: (process.env.SMTP_FROM || user).trim(),
        isPlaceholder,
    }
}

async function verifyMailConfig() {
    const mail = getMailConfig()
    if (mail.isPlaceholder) {
        console.warn('[SMTP] SMTP_USER is still the .env.example placeholder — email disabled until you set a real Gmail')
        return false
    }
    if (!mail.enabled) {
        console.warn('[SMTP] Not configured — email disabled. Set SMTP_USER + SMTP_PASS in .env')
        return false
    }

    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
        host: mail.host,
        port: mail.port,
        secure: mail.secure,
        auth: mail.auth,
    })

    try {
        await transporter.verify()
        console.log(`[SMTP] Ready (${mail.from})`)
        return true
    } catch (err) {
        console.error(
            `[SMTP] Login failed for ${mail.auth.user} — email will not send. ` +
            'Use a Gmail App Password (not your normal password): https://myaccount.google.com/apppasswords'
        )
        console.error(`[SMTP] ${err.code || ''} ${err.message || err}`)
        return false
    }
}

module.exports = { getMailConfig, verifyMailConfig }
