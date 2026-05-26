const express = require('express')
const route = express.Router()
const prgramDetailController = require('../controllers/ProgramDetailController')

route.get('/', prgramDetailController.index)

route.post('/delete_program-detail', prgramDetailController.deleteProgramDetail)

// route.post('/delete_topic', lessonDetailController.deleteTopic)

module.exports = route