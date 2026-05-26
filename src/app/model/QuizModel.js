const mongoose = require('mongoose')
const Schema = mongoose.Schema


const Quiz = new Schema({
    lessonId: { type: Schema.Types.ObjectId, ref: 'lessons' },
    name: { type: String, default: '' }
}, {
    versionKey: false
})
module.exports = mongoose.model('quiz', Quiz)