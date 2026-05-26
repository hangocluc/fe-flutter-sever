const express = require('express')
const route = express.Router()
const FeedBackController = require('../controllers/FeedBackController')

route.get('/feedback', FeedBackController.index)

route.post('/sendMail', FeedBackController.adminsendMail)

route.get('/', FeedBackController.nextFeedBack)

module.exports = route