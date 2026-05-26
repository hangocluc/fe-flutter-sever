const mongoose = require('mongoose')
const Schema = mongoose.Schema


const Topic = new Schema({
    lessonId: { type: Schema.Types.ObjectId, ref: 'lessons' },
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    videoLink: { type: String, default: '' },
}, {
    versionKey: false
})
module.exports = mongoose.model('topic', Topic)