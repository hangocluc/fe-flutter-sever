const User = require('../model/UserModel')

function looksLikeObjectId(value) {
    return typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)
}

async function resolveUserContact(qaOrHints = {}) {
    const hints = [
        qaOrHints.gmail,
        qaOrHints.email,
        qaOrHints.userId,
        qaOrHints.user,
    ]
        .filter(Boolean)
        .map((v) => String(v).trim())

    for (const value of hints) {
        if (value.includes('@')) {
            const user = await User.findOne({ gmail: value })
            return {
                gmail: value,
                username: user?.username || qaOrHints.user || '',
                tokenDevice: user?.tokenDevice || '',
            }
        }
    }

    for (const value of hints) {
        if (looksLikeObjectId(value)) {
            const user = await User.findById(value)
            if (user?.gmail) {
                return {
                    gmail: user.gmail,
                    username: user.username || '',
                    tokenDevice: user.tokenDevice || '',
                }
            }
        }
    }

    return { gmail: '', username: '', tokenDevice: '' }
}

module.exports = { resolveUserContact, looksLikeObjectId }
