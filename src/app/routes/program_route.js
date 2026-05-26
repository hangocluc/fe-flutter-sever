const express = require('express')
const route = express.Router()
const programController = require('../controllers/ProgramController')

route.get('/', programController.index)

route.post('/detele-programs', programController.deleteProgram)

module.exports = route