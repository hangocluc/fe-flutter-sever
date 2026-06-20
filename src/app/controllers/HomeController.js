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

        // Tách riêng top 10 (nhiều nhất) và bottom 10 (ít nhất) thành 2 danh sách
        // độc lập. Trước đây gộp chung 1 chuỗi rồi cắt 10/10 ở view, nên khi tổng số
        // lesson < 20 thì phần bottom lặp lại lesson của phần top -> dữ liệu bị lặp.
        function buildPair(rows) {
            var titles = ''
            var counts = ''
            for (var r of rows) {
                titles += r.title + '/'
                counts += r.count + '/'
            }
            return { titles: titles, counts: counts }
        }

        var top = buildPair(a.slice(0, 10))
        // bottom: lấy 10 lesson ít người học nhất, hiển thị từ ít nhất -> nhiều hơn
        var bottom = buildPair(a.slice(-10).reverse())

        res.render('home', {
            user: user.length,
            lesson: ls.length,
            qa: qa.length,
            listLesson: listLessson,
            listCount: listCount,
            listLessonTop: top.titles,
            listCountTop: top.counts,
            listLessonBottom: bottom.titles,
            listCountBottom: bottom.counts,
        })
    }
}

module.exports = new HomeController()