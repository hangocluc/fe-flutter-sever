const nodemailer = require('nodemailer')
const constance = require('../constance/index')
const QA = require('../model/QAModel')
const { sendToDevice } = require('../services/fcmService')
const { resolveUserContact } = require('../helpers/userContact')
const { getMailConfig } = require('../../config/mail')

function createTransport() {
    const mail = getMailConfig()
    return nodemailer.createTransport({
        host: mail.host,
        port: mail.port,
        secure: mail.secure,
        auth: mail.auth,
    })
}

class FeedBackController {
    index(req, res) {
        res.render('login')
    }

    async adminsendMail(req, res) {
        const mail = getMailConfig()
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

        if (!mail.enabled) {
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

        const transporter = createTransport()
        const fromAddress = mail.from

        const options = {
            from: fromAddress,
            to: req.body.email,
            subject: req.body.subject,
            html: `
<h4 style="color:#2d4373;font-family:Candara,sans-serif">${req.body.message}</h4>
<p>— Flutter Server Admin</p>
`,
        }

        transporter.sendMail(options, async (error) => {
            if (error) {
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
                return
            }

            if (req.body.idQA) {
                await QA.findByIdAndUpdate(req.body.idQA, { status: true }).catch(() => {})
            }

            const qs = new URLSearchParams({
                resolved: '1',
                email: '1',
                push: pushSent ? '1' : '0',
            })
            res.redirect(`/detail_pending?id=${req.body.idQA}&${qs}`)
        })
    }

    async sendMailFeedBack(req, res) {
        const mail = getMailConfig()
        if (!mail.enabled) {
            res.status(503).json({
                code: 503,
                message: 'SMTP not configured. Set SMTP_USER and SMTP_PASS in .env',
                isSuccess: false,
            })
            return
        }

        const transport = createTransport()
        const options = {
            from: mail.from,
            to: req.query.email,
            subject: req.query.subject,
            html: constance.auto + constance.autoMess,
        }

        transport.sendMail(options, (error) => {
            if (error) {
                res.json({
                    code: 404,
                    message: error.message,
                    isSuccess: false,
                })
                return
            }
            res.json({
                code: 200,
                isSuccess: true,
                message: 'Success',
            })
        })
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

            const mail = getMailConfig()

            res.render('feedback', {
                email: contact.gmail,
                idQA: req.query.id || '',
                tokenDevice: contact.tokenDevice,
                name: contact.username,
                smtpConfigured: mail.enabled,
            })
        } catch (e) {
            console.error('nextFeedBack failed:', e)
            res.status(500).send(e.message)
        }
    }
}

module.exports = new FeedBackController()
