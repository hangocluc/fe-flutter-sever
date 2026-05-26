const express = require('express')
const route = express.Router()
const lessonController = require('../controllers/LessonController')
const multer = require('multer')
const path = require('path')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../public/uploads'))
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + '' + file.originalname)
    }
})

const upload = multer({ storage: storage })
//GET /lesson
route.get('/', lessonController.index)

route.post(
    '/add_lesson',
    upload.single('file_excel'),
    lessonController.importLessonFromExcelFile.bind(lessonController),
)

route.post('/detete_lesson', lessonController.deleteLesson)

module.exports = route