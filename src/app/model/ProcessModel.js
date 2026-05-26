const mongoose = require('mongoose')
const Schema = mongoose.Schema

const Process = new Schema({
    userId: { type: String, default: '' },
    lessonId: { type: Schema.Types.ObjectId, ref: 'lessons' },
    completed: { type: Array, default: [] },
    status: { type: Number, default: 0 },
    quizStatus: { type: Number, default: 0 },
    quizMarked: { type: Number, default: 0 },
    dateTime: { type: String, default: '' },
    lastModify: { type: String, default: '' }
}, {
    versionKey: false
})

module.exports = mongoose.model('Process', Process)
