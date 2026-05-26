const fs = require('fs')
const path = require('path')
const admin = require('firebase-admin')

let initialized = false

const EXPECTED_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'applea-e4729'

function findServiceAccountInRoot() {
    const root = process.cwd()
    let files = []

    try {
        files = fs.readdirSync(root).filter(
            (name) => name.includes('firebase-adminsdk') && name.endsWith('.json')
        )
    } catch {
        return null
    }

    if (files.length === 0) {
        return null
    }

    const matching = files.filter((name) => name.startsWith(EXPECTED_PROJECT_ID))
    if (matching.length > 0) {
        return path.resolve(root, matching[0])
    }

    if (files.length === 1) {
        return path.resolve(root, files[0])
    }

    return null
}

function resolveServiceAccountPath() {
    const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    if (fromEnv) {
        return path.isAbsolute(fromEnv)
            ? fromEnv
            : path.resolve(process.cwd(), fromEnv)
    }

    return findServiceAccountInRoot()
}

function loadServiceAccount() {
    const jsonInline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    if (jsonInline) {
        return JSON.parse(jsonInline)
    }

    const credPath = resolveServiceAccountPath()
    if (!credPath) {
        throw new Error(
            `Firebase chưa được cấu hình cho project "${EXPECTED_PROJECT_ID}". ` +
            'Tải Service Account JSON từ Firebase Console → đặt ở thư mục gốc repo ' +
            'hoặc set FIREBASE_SERVICE_ACCOUNT_PATH trong .env'
        )
    }

    if (!fs.existsSync(credPath)) {
        throw new Error(`Không tìm thấy Firebase service account: ${credPath}`)
    }

    const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'))

    if (
        serviceAccount.project_id &&
        serviceAccount.project_id !== EXPECTED_PROJECT_ID
    ) {
        throw new Error(
            `Sai Firebase service account: file thuộc project "${serviceAccount.project_id}" ` +
            `nhưng FIREBASE_PROJECT_ID="${EXPECTED_PROJECT_ID}". ` +
            'Tải key mới từ Console hoặc xóa file *-firebase-adminsdk-*.json cũ.'
        )
    }

    return serviceAccount
}

function initFirebaseAdmin() {
    if (initialized) {
        return admin
    }

    const serviceAccount = loadServiceAccount()
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    })

    initialized = true
    console.log(`Firebase Admin initialized (project: ${serviceAccount.project_id})`)
    return admin
}

function getMessaging() {
    initFirebaseAdmin()
    return admin.messaging()
}

module.exports = { initFirebaseAdmin, getMessaging }
