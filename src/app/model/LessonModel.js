const mongoose = require('mongoose')
const Schema = mongoose.Schema


const Lesson = new Schema({
    title: { type: String, default: '' },
    totalTopic: { type: Number, default: 0 },
}, {
    versionKey: false
})

module.exports = mongoose.model('lesson', Lesson)