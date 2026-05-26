const loginRoute = require('./login_route')
const feedBack = require('./feedback_router')
const lessonRoute = require('./lesson_route')
const apiRoute = require('./api_route')
const lessonDetailRoute = require('./lesson_detail_route')
const programRoute = require('./add_program_route')
const proRoute = require('./program_route')
const detailProgram = require('./detail_program_route')
const userRoute = require('./user_route')
const homeRoute = require('./home_route')
const updateRoute = require('./update_route')
const updateQuestionRoute = require('./update_question_route')
const updateProgramRoute = require('./update_program_route')
const qaRoute = require('./qa_route')
const discussionRoute = require('./chat_route')
const notifi = require('./notification_route')
const qaController = require('../controllers/QAController')
const question = require('../controllers/UpdateQuestionController')
const userControll = require('../controllers/UserController')
const lessonControl = require('../controllers/LessonController')


function route(app) {
    app.use('/', loginRoute)

    app.use('/api', apiRoute)

    app.use('/feedback', (req, res) => {
        res.render('feedback')
    })

    app.use('/feedback', feedBack)

    app.use('/login.html', loginRoute)

    app.use('/index.html', homeRoute)

    app.use('/lesson_detail', lessonDetailRoute)

    app.use('/lesson_detail_v2', question.loadIndext)

    app.use('/add_program', programRoute)

    app.use('/program_detail', detailProgram)

    app.use('/programs.html', proRoute)

    app.use('/notifycation.html', notifi)

    app.use('/lesson.html', lessonRoute)

    app.use('/user.html', userRoute)

    app.get('/add_page.html', (req, res) => {
        res.render('add_page')
    })
    app.use('/discussion', discussionRoute)

    app.get('/forgot-password.html', (req, res) => {
        res.render('forgot-password')
    })

    app.get('/import.html', (req, res) => {
        res.render('import')
    })

    app.use('/pending_request', qaRoute)
    app.use('/detail_pending', qaController.deltailPending)

    app.use('/feed_back', feedBack)

    app.use('/notification', notifi)

    app.use('/nextfeedback', feedBack)

    app.get('/profile.html', (req, res) => {
        res.render('profile')
    })

    app.get('/quiz.html', (req, res) => {
        res.render('quiz')
    })
    app.get('/register.html', (req, res) => {
        res.render('register')
    })

    app.get('/user-detail', userControll.userDetail)

    app.use('/update_topic', updateRoute)

    app.use('/update_program_detail', updateProgramRoute)

    app.use('/update-question', updateQuestionRoute)

    app.get('/user-learned', lessonControl.userLearned)

    app.get('*', function (req, res) {
        res.render('404')
    });


}

module.exports = route