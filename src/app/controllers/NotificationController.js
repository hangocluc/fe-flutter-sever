const constance = require('../constance/index')
const User = require('../model/UserModel')
const { sendToDevice, sendToTopic, sendToDevices } = require('../services/fcmService')

class NotificationController {
    index(req, res) {
        res.render('notifycation')
    }

    async sendNotifiByGmail(req, res) {
        const gmail = req.body.gmail && String(req.body.gmail).trim()
        const title = req.body.title
        const body = req.body.body

        if (!gmail || !title || !body) {
            res.json({
                message: 'Cần truyền đủ tham số (gmail, title, body)',
                isSuccess: false,
            })
            return
        }

        try {
            const user = await User.findOne({ gmail })
            if (!user || !user.tokenDevice) {
                res.json({
                    message: 'User chưa đăng ký FCM token (gọi POST /api/insert-user từ app)',
                    isSuccess: false,
                    code: 404,
                })
                return
            }

            await sendToDevice(user.tokenDevice, {
                title,
                body,
                data: req.body.data || {},
            })

            res.json({
                message: 'Thành công',
                code: 200,
                isSuccess: true,
            })
        } catch (err) {
            console.error('FCM send by gmail failed:', err)
            res.json({
                message: err.message || 'Gửi thông báo thất bại',
                code: 500,
                isSuccess: false,
            })
        }
    }

    async sendNotifiWithUser(req, res) {
        const title = req.body.title
        const body = req.body.body
        let token = req.body.token && String(req.body.token).trim()

        if (!title || !body) {
            res.json({
                message: 'Cần truyền đủ tham số (title, body) và token hoặc gmail',
            })
            return
        }

        if (!token && req.body.gmail) {
            const user = await User.findOne({
                gmail: String(req.body.gmail).trim(),
            })
            if (!user || !user.tokenDevice) {
                res.json({
                    message: 'Không tìm thấy FCM token cho gmail này',
                    isSuccess: false,
                })
                return
            }
            token = user.tokenDevice
        }

        if (!token) {
            res.json({
                message: 'Cần token hoặc gmail',
            })
            return
        }

        try {
            await sendToDevice(token, {
                title,
                body,
                data: req.body.data || {
                    title: 'success',
                    body: '{"name" : "admin_canhnamdinh"}',
                },
            })

            const qa = new QA('Chào bạn ', 'Cảm ơn bạn đã gửi báo cáo')
            res.json({
                message: 'Thanh cong',
                code: 200,
                isSuccess: true,
                data: qa,
            })
        } catch (err) {
            console.error('FCM send failed:', err)
            res.json({
                message: err.message || 'Gửi thông báo thất bại',
                code: 500,
                isSuccess: false,
            })
        }
    }

    async sendNotifiAllUser(req, res) {
        if (!req.body.title || !req.body.text) {
            res.json({
                message: 'Cần truyền đủ tham số  ',
            })
            return
        }

        try {
            await sendToTopic(constance.topic, {
                title: req.body.title,
                body: req.body.text,
                data: {
                    title: 'ok',
                    body: '{"name" : "admin_canhnamdinh"}',
                },
            })
            res.redirect('/index.html')
        } catch (err) {
            console.error('FCM topic send failed:', err)
            res.json({
                message: err.message || 'Gửi thông báo thất bại',
            })
        }
    }

    async sendStudyReminder(overrides = {}) {
        const title =
            overrides.title ||
            process.env.STUDY_REMINDER_TITLE ||
            'Flutter Server'
        const body =
            overrides.body ||
            process.env.STUDY_REMINDER_BODY ||
            'Bắt đầu bài học hôm nay thôi nào. Hãy luyện tập mỗi ngày bạn nhé!'

        const payload = {
            title,
            body,
            data: {
                type: 'study_reminder',
                title,
                body,
            },
        }

        const users = await User.find({
            tokenDevice: { $exists: true, $nin: ['', null] },
        }).select('tokenDevice gmail')

        const tokens = [
            ...new Set(
                users
                    .map((u) => String(u.tokenDevice).trim())
                    .filter((t) => t && t !== 'flutter_device_token')
            ),
        ]

        if (tokens.length > 0) {
            const result = await sendToDevices(tokens, payload)
            console.log(
                `[Study reminder] Gửi token: ${result.successCount}/${tokens.length} thành công`
            )
        } else {
            console.log(
                '[Study reminder] Không có FCM token trong DB — cần POST /api/insert-user từ app'
            )
        }

        if (process.env.STUDY_REMINDER_USE_TOPIC === 'true') {
            await sendToTopic(constance.topic, payload)
            console.log('[Study reminder] Đã gửi thêm topic all')
        }
    }

    async sendNotifiAll() {
        try {
            await this.sendStudyReminder()
        } catch (err) {
            console.error('Daily FCM send failed:', err)
        }
    }
}

class QA {
    constructor(title, body) {
        this.title = title
        this.body = body
    }
}

module.exports = new NotificationController()
