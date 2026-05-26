const express = require('express')
const route = express.Router()
const updateController = require('../controllers/UpdateProDetailController')

route.get('/', updateController.index)

route.post('/update', updateController.updateProgram)

module.exports = route