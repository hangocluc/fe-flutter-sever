const constance = require('../constance/index')
const QA = require('../model/QAModel')
const { sendToDevice } = require('../services/fcmService')
const { resolveUserContact } = require('../helpers/userContact')
const { getEmailConfig, sendEmail } = require('../../config/mail')

class FeedBackController {
    index(req, res) {
        res.render('login')
    }

    async adminsendMail(req, res) {
        const emailConfig = getEmailConfig()
        const pushTitle = `${constance.title}${req.body.username || ''}`
        let pushSent = false

        if (req.body.tokenDevice) {
            try {
                await sendToDevice(req.body.tokenDevice, {
                    title: pushTitle,
                    body: req.body.message || constance.text,
                    data: { type: 'admin_reply' },
                })
                pushSent = true
            } catch (err) {
                console.error('FCM feedback notification failed:', err)
            }
        }

        if (!emailConfig.enabled) {
            if (req.body.idQA) {
                await QA.findByIdAndUpdate(req.body.idQA, { status: true }).catch(() => {})
            }
            const qs = new URLSearchParams({
                resolved: '1',
                push: pushSent ? '1' : '0',
                email: '0',
            })
            res.redirect(`/detail_pending?id=${req.body.idQA}&${qs}`)
            return
        }

        const html = `
<h4 style="color:#2d4373;font-family:Candara,sans-serif">${req.body.message}</h4>
<p>— Flutter Server Admin</p>
`

        try {
            await sendEmail({
                to: req.body.email,
                subject: req.body.subject,
                html,
            })
            console.log(`[Email] Sent to ${req.body.email} — subject: ${req.body.subject}`)

            if (req.body.idQA) {
                await QA.findByIdAndUpdate(req.body.idQA, { status: true }).catch(() => {})
            }

            const qs = new URLSearchParams({
                resolved: '1',
                email: '1',
                push: pushSent ? '1' : '0',
            })
            res.redirect(`/detail_pending?id=${req.body.idQA}&${qs}`)
        } catch (error) {
            console.error('sendMail failed:', error.message || error)

            if (req.body.idQA) {
                await QA.findByIdAndUpdate(req.body.idQA, { status: true }).catch(() => {})
            }

            const qs = new URLSearchParams({
                resolved: '1',
                email: '0',
                push: pushSent ? '1' : '0',
            })
            if (!pushSent) {
                qs.set('emailError', '1')
            }
            res.redirect(`/detail_pending?id=${req.body.idQA}&${qs}`)
        }
    }

    async sendMailFeedBack(req, res) {
        const emailConfig = getEmailConfig()
        if (!emailConfig.enabled) {
            res.status(503).json({
                code: 503,
                message: 'Email not configured. Set RESEND_API_KEY or SMTP_USER + SMTP_PASS',
                isSuccess: false,
            })
            return
        }

        try {
            await sendEmail({
                to: req.query.email,
                subject: req.query.subject,
                html: constance.auto + constance.autoMess,
            })
            res.json({
                code: 200,
                isSuccess: true,
                message: 'Success',
            })
        } catch (error) {
            res.json({
                code: 404,
                message: error.message,
                isSuccess: false,
            })
        }
    }

    async nextFeedBack(req, res) {
        try {
            const qa = req.query.id ? await QA.findById(req.query.id) : null
            const contact = await resolveUserContact({
                gmail: req.query.email,
                userId: qa?.userId,
                user: qa?.user,
            })

            if (!contact.gmail) {
                res.status(400).send(
                    'Cannot reply: no user email found. Ask the user to sign in with Gmail in the app (insert-user).'
                )
                return
            }

            const emailConfig = getEmailConfig()

            res.render('feedback', {
                email: contact.gmail,
                idQA: req.query.id || '',
                tokenDevice: contact.tokenDevice,
                name: contact.username,
                smtpConfigured: emailConfig.enabled,
                emailConfigured: emailConfig.enabled,
            })
        } catch (e) {
            console.error('nextFeedBack failed:', e)
            res.status(500).send(e.message)
        }
    }
}

module.exports = new FeedBackController()
