const mongoose = require('mongoose')
const Schema = mongoose.Schema

const QA = new Schema({
    userId: { type: String, default: '' },
    user: { type: String, default: '' },
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    idQuestionId: { type: String, default: '' },
    lessonId: { type: String, default: '' },
    category: { type: String, default: '' },
    platform: { type: String, default: '' },
    status: { type: Boolean, default: false },
    type: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
}, {
    versionKey: false,
})

module.exports = mongoose.model('QA', QA)
