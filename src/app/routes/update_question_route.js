const express = require('express')
const route = express.Router()
const updateController = require('../controllers/UpdateQuestionController')

route.get('/', updateController.index)

route.post('/update-question', updateController.updateQuestion)

// route.post('/update-questionv2', updateController.updateQuestionV2)

module.exports = route