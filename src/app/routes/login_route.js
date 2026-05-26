const express = require('express')
const route = express.Router()
const LoginController = require('../controllers/LoginController')

//GET /login
route.get('/', LoginController.index)

route.post('/login', LoginController.login)


module.exports = route