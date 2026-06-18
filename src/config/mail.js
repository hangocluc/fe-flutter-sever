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

function getEmailConfig() {
    const brevoKey = (process.env.BREVO_API_KEY || '').trim()
    const resendKey = (process.env.RESEND_API_KEY || '').trim()
    const smtp = getMailConfig()
    const from = (
        process.env.EMAIL_FROM ||
        process.env.RESEND_FROM ||
        smtp.from ||
        ''
    ).trim()

    // Brevo ưu tiên cao nhất: chỉ cần verify 1 email lẻ (không cần domain),
    // dùng HTTP API nên không bị Render chặn port SMTP.
    if (brevoKey) {
        return { provider: 'brevo', enabled: Boolean(from), from, brevoKey, resendKey: '', smtp }
    }
    if (resendKey) {
        return { provider: 'resend', enabled: Boolean(from), from, resendKey, brevoKey: '', smtp }
    }
    if (smtp.enabled) {
        return { provider: 'smtp', enabled: true, from: smtp.from, resendKey: '', brevoKey: '', smtp }
    }
    return { provider: null, enabled: false, from, resendKey: '', brevoKey: '', smtp }
}

function createSmtpTransport(mail = getMailConfig(), portOverride) {
    const nodemailer = require('nodemailer')
    const port = portOverride || mail.port
    return nodemailer.createTransport({
        host: mail.host,
        port,
        // port 465 luôn dùng SSL ngầm; 587 dùng STARTTLS
        secure: port === 465 ? true : mail.secure,
        auth: mail.auth,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
    })
}

// Render thường chặn port 587, nên thử 465 như phương án dự phòng
function getSmtpPortsToTry(mail) {
    const ports = [mail.port]
    if (!ports.includes(465)) ports.push(465)
    if (!ports.includes(587)) ports.push(587)
    return ports
}

// Tách "Tên <email@x.com>" -> { name, email }; nếu chỉ có email thì name rỗng
function parseAddress(value) {
    const str = (value || '').trim()
    const match = str.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/)
    if (match) return { name: match[1].replace(/^"|"$/g, ''), email: match[2].trim() }
    return { name: '', email: str }
}

async function sendViaBrevo({ to, subject, html, from }, brevoKey) {
    const sender = parseAddress(from)
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': brevoKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({
            sender: sender.name ? { name: sender.name, email: sender.email } : { email: sender.email },
            to: [{ email: to }],
            subject,
            htmlContent: html,
        }),
    })

    if (!response.ok) {
        const body = await response.text()
        throw new Error(`Brevo ${response.status}: ${body}`)
    }
}

async function sendViaResend({ to, subject, html, from }, resendKey) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from,
            to: [to],
            subject,
            html,
        }),
    })

    if (!response.ok) {
        const body = await response.text()
        throw new Error(`Resend ${response.status}: ${body}`)
    }
}

async function sendEmail({ to, subject, html, from }) {
    const config = getEmailConfig()
    if (!config.enabled) {
        throw new Error('Email not configured')
    }

    const fromAddress = from || config.from
    if (!fromAddress) {
        throw new Error('EMAIL_FROM is required when using Resend')
    }

    if (config.provider === 'brevo') {
        await sendViaBrevo({ to, subject, html, from: fromAddress }, config.brevoKey)
        return
    }

    if (config.provider === 'resend') {
        await sendViaResend({ to, subject, html, from: fromAddress }, config.resendKey)
        return
    }

    // SMTP: thử lần lượt các port (587 -> 465). Nếu lỗi do kết nối (Render chặn),
    // thử port tiếp theo; nếu hết port mà vẫn lỗi thì ném lỗi cuối cùng.
    const ports = getSmtpPortsToTry(config.smtp)
    let lastErr
    for (const port of ports) {
        try {
            const transporter = createSmtpTransport(config.smtp, port)
            await transporter.sendMail({ from: fromAddress, to, subject, html })
            return
        } catch (err) {
            lastErr = err
            const isConnError = ['ETIMEDOUT', 'ECONNREFUSED', 'ESOCKET', 'ECONNECTION'].includes(err.code)
            if (!isConnError) throw err // lỗi auth/nội dung -> không cần thử port khác
            console.warn(`[Email] SMTP port ${port} thất bại (${err.code}), thử port khác...`)
        }
    }
    throw lastErr
}

async function verifyMailConfig() {
    const config = getEmailConfig()

    if (config.provider === 'brevo') {
        if (!config.from) {
            console.warn('[Email] BREVO_API_KEY set but EMAIL_FROM missing (phải là email đã verify trên Brevo)')
            return false
        }
        console.log(`[Email] Brevo API ready (from: ${config.from})`)
        return true
    }

    if (config.provider === 'resend') {
        if (!config.from) {
            console.warn('[Email] RESEND_API_KEY set but EMAIL_FROM missing')
            return false
        }
        console.log(`[Email] Resend API ready (from: ${config.from})`)
        return true
    }

    const mail = config.smtp
    if (mail.isPlaceholder) {
        console.warn('[Email] SMTP_USER is placeholder — set RESEND_API_KEY (Render) or SMTP_USER+SMTP_PASS (local)')
        return false
    }
    if (!mail.enabled) {
        console.warn('[Email] Not configured — set RESEND_API_KEY or SMTP_USER + SMTP_PASS')
        return false
    }

    const transporter = createSmtpTransport(mail)
    try {
        await transporter.verify()
        console.log(`[Email] Gmail SMTP ready (${mail.from})`)
        return true
    } catch (err) {
        console.error(
            `[Email] Gmail SMTP failed for ${mail.auth.user}. ` +
            'On Render use RESEND_API_KEY instead (SMTP port 587 is blocked).'
        )
        console.error(`[Email] ${err.code || ''} ${err.message || err}`)
        return false
    }
}

module.exports = {
    getMailConfig,
    getEmailConfig,
    verifyMailConfig,
    createSmtpTransport,
    sendEmail,
}
