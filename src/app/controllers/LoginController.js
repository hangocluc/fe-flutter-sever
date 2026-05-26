class LoginController {

    index(req, res) {
        res.render('login')
    }

    login(req, res) {
        if (req.body.email == 'admin' && req.body.password == 'admin') {
            res.redirect('/index.html')
        } else {
            res.render('login', {
                message: 'Username or Password Invalid',
                currentUsername: req.body.email,
                currentPass: req.body.password
            })
        }
    }

    // JSON-based login for API clients
    loginApi(req, res) {
        const { email, password } = req.body || {}
        if (email === 'admin' && password === 'admin') {
            return res.status(200).json({ success: true, message: 'success' })
        }
        return res.status(401).json({ success: false, message: 'Username or Password Invalid' })
    }

}

module.exports = new LoginController()