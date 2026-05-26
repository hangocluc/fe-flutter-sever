const express = require('express')
const route = express.Router()
const updateController = require('../controllers/UpdateController')

route.get('/', updateController.showTopic)

route.post('/update-topic', updateController.updateTopic)

route.post('/update-question', updateController.updateQuestion)

route.post('/update-questionv2', updateController.updateQuestionv2)

module.exports = route