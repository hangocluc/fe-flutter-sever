const User = require('../model/UserModel')
const Lesson = require('../model/LessonModel')
const QA = require('../model/QAModel')
const Process = require('../model/ProcessModel')
const { updateQA } = require('./QAController')


class HomeController {
    async getProperty(req, res) {
        var user = await User.find({})
        var ls = await Lesson.find({})
        var qa = await QA.find({})
        var a = await Lesson.aggregate([
            {
                $lookup: {
                    from: "processes",       // other table name
                    localField: "_id",   // name of users table field
                    foreignField: "lessonId", // name of userinfo table field
                    as: "process"         // alias for userinfo table
                }
            },
            {
                $project: {
                    title: 1,
                    count: { $size: "$process" },
                }
            }
        ]);
        var listLessson = ''
        var listCount = ''

        for (var i of a) {
            listLessson += i.title + '/'
            listCount += i.count + '/'
        }
        function compare(a1, a2) {
            if (a1.count > a2.count) {
                return -1;
            }
            if (a1.count < a2.count) {
                return 1;
            }
            return 0;
        }

        a.sort(compare);

        var listLessson2 = ''
        var listCount2 = ''
        for (var i = 0; i < 10; i++) {
            if (a[i] != null) {
                listLessson2 += a[i].title + '/'
                listCount2 += a[i].count + '/'
            }
        }

        for (var i = a.length - 10; i < a.length; i++) {
            if (a[i] != null) {
                listLessson2 += a[i].title + '/'
                listCount2 += a[i].count + '/'
            }
        }

        res.render('home', { user: user.length, lesson: ls.length, qa: qa.length, listLesson: listLessson, listCount: listCount, listLesson2: listLessson2, listCount2: listCount2 })
    }
}

module.exports = new HomeController()