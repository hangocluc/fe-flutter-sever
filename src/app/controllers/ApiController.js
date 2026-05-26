const Lesson = require('../model/LessonModel')
const Topic = require('../model/TopicModel')
const Quiz = require('../model/QuizModel')
const Question = require('../model/QuestionModel')
const Program = require('../model/ProgramModel')
const ProgramDetail = require('../model/ProgramDetailModel')
const User = require('../model/UserModel')
const Process = require('../model/ProcessModel')

class ApiController {

    //get all lesson:
    getAllLesson(req, res, next) {
        Lesson.find({}).then(lesson => res.json({
            isSuccess: true,
            code: 200,
            message: "success",
            data: lesson,
        })).catch(e => res.json({
            status: false,
            message: e.message,
            code: 404
        }))
    }

    //get topic by id
    getTopicByLessonId(req, res, next) {
        if (req.query.lessonId == null) {
            res.json({
                message: 'Cần truyền param lessonId',
                isSuccess: false
            })
            return;
        }
        Topic.find({ lessonId: req.query.lessonId }).then(topic => {
            res.json({
                isSuccess: true,
                code: 200,
                message: "success",
                data: topic,
            })
        }).catch(e => res.json({
            isSuccess: false,
            message: e.message,
            code: 404
        }))
    }

    //get question by id
    getQuestionByLessonId(req, res, next) {
        if (req.query.lessonId == null) {
            res.json({
                message: 'Cần truyền param lessonId',
                isSuccess: false
            })
            return;
        }
        Quiz.findOne({ lessonId: req.query.lessonId }).then(quiz => {
            if (quiz == null) {
                res.json({
                    isSuccess: true,
                    code: 200,
                    message: "success",
                    data: [],
                })
                return
            }
            Question.find({ quizId: quiz._id }).then(question => res.json({
                isSuccess: true,
                code: 200,
                message: "success",
                data: question,
            })).catch(e => {
                res.json({
                    status: false,
                    message: e.message,
                    code: 404
                })
                return
            })
        }).catch(e => {
            res.json({
                isSuccess: false,
                status: false,
                message: e.message,
                code: 404
            })
        })
    }

    //get all in lesson
    async getAllByLesson(req, res, next) {

        var a = await Lesson.aggregate([

            {
                $lookup: {
                    from: "quizzes",       // other table name
                    localField: "_id",   // name of users table field
                    foreignField: "lessonId", // name of userinfo table field
                    as: "quiz"         // alias for userinfo table
                }
            },
            { $unwind: "$quiz" },     // $unwind used for getting data in object or for one record only
            {
                $lookup: {
                    from: "topics",       // other table name
                    localField: "_id",   // name of users table field
                    foreignField: "lessonId", // name of userinfo table field
                    as: "topic"         // alias for userinfo table
                }
            },
            {
                $lookup: {
                    from: "questions",       // other table name
                    localField: "_id",   // name of users table field
                    foreignField: "lessonId", // name of userinfo table field
                    as: "question"         // alias for userinfo table
                }
            },
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
                    id: 1,
                    title: 1,
                    totalTopic: 1,
                    count: { $size: "$process" },
                    quiz: {
                        _id: "$quiz._id",
                        lessonId: "$quiz.lessonId",
                        name: "$quiz.name",
                        question: "$question"
                    },
                    topic: "$topic",
                }
            }
        ]);
        res.json({
            isSuccess: true,
            code: 200,
            message: "success",
            data: a
        })
    }


    async getAllLessonData(req, res, next) {

        try {
            var lessons = await Lesson.find({})
            var listData = []
            for (var ls of lessons) {
                const topic = await Topic.find({ lessonId: ls._id })
                var lessonAll = new LessonAll(ls.id, ls.title, ls.totalTopic, topic, null)
                listData.push(lessonAll)
            }
            res.json({
                isSuccess: true,
                code: 200,
                message: "success",
                data: listData
            })
        } catch (e) {
            res.json({
                status: false,
                message: e.message,
                code: 404
            })
        }
    }


    //get Program:
    getProgram(req, res, next) {
        var listData = []
        Program.find({}).then(program => {
            for (var pr of program) {
                // var data = Buffer.from(pr.image.data, "binary").toString("base64");
                var programMd = new ProgramMD(pr._id, pr.name, pr.image)
                listData.push(programMd)
            }
            res.json(listData)

        }).catch(e => res.json({
            status: false,
            message: e.message,
            code: 404
        }))
    }

    //get program detail by id:
    getProgramDetail(req, res, next) {
        if (req.query.programId == null) {
            res.json({
                message: 'Cần truyền param programId',
                status: false
            })
            return;
        }
        ProgramDetail.find({ programId: req.query.programId }).then(programDetail => {
            res.json(programDetail)
        }).catch(e => res.json({
            isSuccess: false,
            message: e.message,
            code: 404
        }))
    }

    //get all in program
    async getAllInProgram(req, res, next) {
        var program = await Program.find({})
        var listData = [];
        for (var pr of program) {
            const programDetail = await ProgramDetail.find({ programId: pr._id })
            var program = new ProgramWithDetail(pr._id, pr.name, programDetail, pr.image)
            listData.push(program)
        }
        res.json(listData)
    }

    //get score daily score by user id
    getDailyScore(req, res) {
        if (req.query.userId == null || req.query.date == null) {
            res.json({
                isSuccess: false,
                message: 'Cần truyền userId, date',
                code: 404
            })
            return
        }
        Process.find({ userId: req.query.userId, lastModify: req.query.date }).then(users => {
            var sumScore = 0
            for (var i of users) {
                sumScore += Number(i.quizMarked)
            }
            res.json({
                isSuccess: true,
                code: 200,
                message: "success",
                score: sumScore,
                userId: req.query.userId,
                date: req.query.date
            })
        }).catch(e => {
            res.json({
                isSuccess: false,
                message: e.message,
                code: 404
            })
        })
    }

    //get 1 week score:
    async getMarkProfile(req, res) {
        if (req.query.userId == null) {
            res.json({
                isSuccess: false,
                message: 'Cần truyền userId',
                code: 404
            })
            return
        }
        var today = new Date();
        var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        var now = new Date(date)
        var nowToMilisen = now.getTime()
        var listData = []
        for (var i = 0; i < 7; i++) {
            var milisecond = 1000 * 60 * 60 * 24 * i
            var dayWork = nowToMilisen - milisecond //tính khoảng cách hiện tại tới ngày thứ 'i'
            var day = new Date(dayWork) // trả về datetime: yyyy-MM-dd hh:mm:ss
            var dayFomarted = day.getUTCFullYear() + "/" + (day.getUTCMonth() + 1) + "/" + day.getUTCDate(); // format datetime: yyyy-MM-dd
            var dayReturn = day.getUTCDate() + '/' + (day.getUTCMonth() + 1);
            try {
                var process = await Process.find({ userId: req.query.userId, lastModify: dayFomarted })
                if (process.length > 0) {
                    var sumScore = 0
                    for (var j of process) {
                        sumScore += Number(j.quizMarked)
                    }
                    listData.push({
                        date: dayReturn,
                        mark: sumScore
                    })
                } else {
                    listData.push({
                        date: dayReturn,
                        mark: 0
                    })
                }
            } catch (e) {
                res.json({
                    isSuccess: false,
                    message: e.message,
                    code: 404
                })
            }
        }

        res.json({
            isSuccess: true,
            code: 200,
            message: "success",
            userId: req.query.userId,
            data: listData,
        })

    }

}

class ProgramMD {
    _id
    name
    image
    constructor(id, name, image) {
        this._id = id
        this.name = name
        this.image = image
    }
}

class ProgramWithDetail {
    _id
    name
    image
    programDetail
    constructor(id, name, programDetail, image) {
        this._id = id
        this.name = name
        this.image = image
        this.programDetail = programDetail
    }
}
class QuizMD {
    _id
    lessonId
    name
    question

    constructor(_id, lessonId, name, question) {
        this._id = _id
        this.lessonId = lessonId
        this.name = name
        this.question = question
    }

}


class LessonAll {
    id
    title
    totalTopic
    quiz
    topic
    constructor(id, title, totalTopic, topic, quiz) {
        this.id = id,
            this.title = title,
            this.totalTopic = totalTopic,
            this.topic = topic,
            this.quiz = quiz
    }
}

module.exports = new ApiController()