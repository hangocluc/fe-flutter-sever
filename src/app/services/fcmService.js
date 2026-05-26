const { getMessaging } = require('../../config/firebase')

function normalizeTopic(topic) {
    if (!topic) {
        return 'all'
    }
    if (topic.startsWith('/topics/')) {
        return topic.slice('/topics/'.length)
    }
    return topic
}

function stringifyData(data) {
    return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value)])
    )
}

async function sendToDevice(token, { title, body, data = {} }) {
    if (!token) {
        throw new Error('FCM token is required')
    }

    return getMessaging().send({
        token,
        notification: { title, body },
        data: stringifyData(data),
    })
}

async function sendToTopic(topic, { title, body, data = {} }) {
    return getMessaging().send({
        topic: normalizeTopic(topic),
        notification: { title, body },
        data: stringifyData(data),
    })
}

async function sendToDevices(tokens, { title, body, data = {} }) {
    const unique = [...new Set(
        tokens.map((t) => String(t).trim()).filter(Boolean)
    )]

    if (unique.length === 0) {
        return { successCount: 0, failureCount: 0 }
    }

    const response = await getMessaging().sendEachForMulticast({
        tokens: unique,
        notification: { title, body },
        data: stringifyData(data),
    })

    return {
        successCount: response.successCount,
        failureCount: response.failureCount,
    }
}

module.exports = { sendToDevice, sendToTopic, sendToDevices }
