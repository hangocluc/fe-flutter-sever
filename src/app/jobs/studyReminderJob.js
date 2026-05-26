const cron = require('node-cron')
const notificationController = require('../controllers/NotificationController')

const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/

function timeToCronExpression(time) {
    const match = TIME_PATTERN.exec(String(time).trim())
    if (!match) {
        throw new Error(`Giờ không hợp lệ "${time}" (dùng HH:MM, ví dụ 08:00, 20:30)`)
    }
    const hour = Number(match[1])
    const minute = Number(match[2])
    return `${minute} ${hour} * * *`
}

function parseReminderTimes() {
    const raw = process.env.STUDY_REMINDER_TIMES || '20:00'
    return raw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
}

function startStudyReminderJobs() {
    if (process.env.STUDY_REMINDER_ENABLED === 'false') {
        console.log('[Study reminder] Tắt (STUDY_REMINDER_ENABLED=false)')
        return
    }

    const timezone = process.env.STUDY_REMINDER_TIMEZONE || 'Asia/Ho_Chi_Minh'
    const times = parseReminderTimes()

    times.forEach((time) => {
        const expression = timeToCronExpression(time)
        cron.schedule(
            expression,
            () => {
                console.log(`[Study reminder] Gửi nhắc học lúc ${time} (${timezone})`)
                notificationController.sendStudyReminder().catch((err) => {
                    console.error('[Study reminder] Gửi FCM thất bại:', err.message)
                })
            },
            { timezone }
        )
        console.log(
            `[Study reminder] Đã lên lịch ${time} hàng ngày → cron "${expression}" (${timezone})`
        )
    })
}

module.exports = { startStudyReminderJobs, timeToCronExpression }
