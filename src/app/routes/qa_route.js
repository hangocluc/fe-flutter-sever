const express = require('express')
const route = express.Router()
const qaController = require('../controllers/QAController')

route.get('/', qaController.index)


route.post('/update-qa', qaController.updateQA)

route.post('/delete-qa', qaController.deleteQA)

module.exports = route