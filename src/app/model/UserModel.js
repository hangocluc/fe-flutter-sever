const mongoose = require('mongoose')
const Schema = mongoose.Schema

const User = new Schema({
    gmail: { type: String, default: '' },
    tokenDevice: { type: String, default: '' },
    username: { type: String, default: '' },
    imageUrl: {
        type: String,
        default: 'https://firebasestorage.googleapis.com/v0/b/managefood-8ae7b.appspot.com/o/user.png?alt=media&token=ab0d2547-a984-4029-afd7-d04cd74a33b4'
    },
    mark: { type: Number, default: 0 }
}, {
    versionKey: false
})

module.exports = mongoose.model('User', User)
