const express = require('express')
const route = express.Router()
const userController = require('../controllers/UserController')

//GET /
route.get('/', userController.index)


module.exports = route