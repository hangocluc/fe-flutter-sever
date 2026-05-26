const mongoose = require('mongoose')
const Schema = mongoose.Schema

const Program = new Schema({
    name: { type: String, default: '' },
    image: { type: String, default: '' },
}, {
    versionKey: false
})

module.exports = mongoose.model('Program', Program)
