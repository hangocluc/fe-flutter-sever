const express = require('express')
const route = express.Router()
const homeController = require('../controllers/HomeController')

route.get('/', homeController.getProperty)
route.get('/pending_request', (req, res) => {
        res.render('pending_request')
    })
module.exports = route