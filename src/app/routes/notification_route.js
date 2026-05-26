const express = require('express')
const route = express.Router()
const notificationController = require('../controllers/NotificationController')

//GET /login
route.get('/', notificationController.index)

route.post('/sendNotifi', notificationController.sendNotifiWithUser)

route.post('/sendAll', notificationController.sendNotifiAllUser)

module.exports = route