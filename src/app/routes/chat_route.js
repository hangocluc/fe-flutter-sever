const express = require('express')
const route = express.Router()
const chatController = require('../controllers/ChatController')

route.get('/', chatController.index)

module.exports = route