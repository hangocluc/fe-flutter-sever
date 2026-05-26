const express = require('express')
const route = express.Router()
const apiController = require('../controllers/ApiController')
const processController = require('../controllers/ProcessController')
const userController = require('../controllers/UserController')
const qaController = require('../controllers/QAController')
const chatController = require('../controllers/ChatController')
const feedback = require('../controllers/FeedBackController')
const LessonController = require('../controllers/LessonController')
const Notification = require('../controllers/NotificationController')
const LoginController = require('../controllers/LoginController')


//lesson
route.get('/get-lesson', apiController.getAllLesson)

route.get('/sendmail_user', feedback.sendMailFeedBack)

route.get('/get-topic', apiController.getTopicByLessonId)

route.get('/get-quiz', apiController.getQuestionByLessonId)

route.get('/get-all-in-lesson', apiController.getAllByLesson)

route.get('/get-all-quiz', LessonController.getAllQuiz)

route.get('/get-all-topic', LessonController.getAllTopic)

route.get('/get-all-topic-no-fomart', LessonController.getAllTopicWithNoFomart)

route.get('/get-list-lesson', apiController.getAllLessonData)

route.get('/thong-ke', LessonController.thongKeUser)


//program
route.get('/get-program', apiController.getProgram)

route.get('/get-program-detail', apiController.getProgramDetail)

route.get('/get-all-in-program', apiController.getAllInProgram)

// user && mark
route.post('/insert-user', userController.insertUser)

route.post('/update-mark-user', userController.updateUser)

route.get('/get-top-user', userController.getRank)

route.get('/top-lesson-score', userController.getTop10Lesson)



// route.get('/get-rank', userController.getRank)

route.get('/get-user', userController.getUser)

route.get('/get-daily-score', apiController.getDailyScore)

route.get('/get-score-profile', apiController.getMarkProfile)

// process
route.post('/update-process', processController.insertOrUpdate)

route.get('/get-process', processController.getProcess)

route.get('/get-all-process', processController.getProcessByUser)



//qa / lesson feedback
route.post('/add-qa', qaController.addQA)
route.post('/insert-lesson-feedback', qaController.insertLessonFeedback)
route.post('/insert-system-feedback', qaController.insertSystemFeedback)

//chat:
route.post('/add-comment', chatController.addComment)

route.post('/update-comment', chatController.updateComment)

route.post('/delete-comment', chatController.deleteChat)

route.get('/get-comment-by-question', chatController.getChatByQuestionId)

route.get('/get-comment-by-quiz', chatController.getChatByQuiz)

route.get('/get-all-comment', chatController.getAllChat)

route.get('/get-comment-by-questionid', chatController.getChatByQuestion)

route.post('/send-notifi-with-user', Notification.sendNotifiWithUser)

route.post('/send-notifi-by-gmail', Notification.sendNotifiByGmail)

route.post('/trigger-study-reminder', (req, res) => {
    Notification.sendStudyReminder()
        .then(() => res.json({ message: 'Đã gửi nhắc học', isSuccess: true }))
        .catch((err) => res.status(500).json({ message: err.message, isSuccess: false }))
})

// auth
route.post('/login', LoginController.loginApi)

module.exports = route

