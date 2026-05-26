const User = require('../model/UserModel')
const Process = require('../model/ProcessModel')
const Lesson = require('../model/LessonModel')
const { status } = require('express/lib/response')

class UserController {
    //insert user:
    insertUser(req, res, next) {
        const gmail = req.body.gmail && String(req.body.gmail).trim()
        const tokenDevice = req.body.tokenDevice && String(req.body.tokenDevice).trim()
        if (!gmail || !tokenDevice) {
            res.status(400).json({ message: 'gmail, tokenDevice không được trống' })
            return
        }

        User.findOne({ gmail }).then(user => {
            if (user != null) {
                let changed = false
                if (user.tokenDevice !== tokenDevice) {
                    user.tokenDevice = tokenDevice
                    changed = true
                }
                if (req.body.username != null && user.username !== req.body.username) {
                    user.username = req.body.username
                    changed = true
                }
                if (req.body.imageUrl != null && user.imageUrl !== req.body.imageUrl) {
                    user.imageUrl = req.body.imageUrl
                    changed = true
                }
                if (changed) {
                    user.save().then(u => {
                        res.json({
                            message: "Thành công",
                            type: 1,
                            isSuccess: true,
                            code: 200,
                            data: u
                        })
                        return;
                    }).catch(e => res.status(500).json({
                        isSuccess: false,
                        message: e.message,
                        code: 404
                    }))
                } else {
                    res.json({
                        message: "Thành công",
                        type: 1,
                        isSuccess: true,
                        code: 200,
                        data: user
                    })
                    return;
                }


            } else {
                const mark = req.body.mark == null ? 0 : req.body.mark
                const username = req.body.username == null ? '' : req.body.username
                User({
                    gmail,
                    mark,
                    tokenDevice,
                    imageUrl: req.body.imageUrl,
                    username
                }).save().then(user => {
                    res.json({
                        message: "Thành công",
                        type: 0,
                        isSuccess: true,
                        code: 200,
                        data: user
                    })
                }).catch(e => res.json({
                    isSuccess: false,
                    message: e.message,
                    code: 404
                }))
            }

        }).catch(e => res.json({
            isSuccess: false,
            message: e.message,
            code: 404
        }))


    }

    //update
    updateUser(req, res, next) {
        if (req.body.id == null || req.body.mark == null) {
            res.json({ message: 'Cân truyền id, mark' })
            return
        }
        User.findOne({ _id: req.body.id }).then(user => {
            if (user == null) {
                res.json({ message: "User không tồn tại, kiểm tra lại id", isSuccess: false })
            }
            var mark = user.mark;
            if (req.body.mark != '') {
                mark += Number(req.body.mark)
                user.mark = mark;
            }
            user.save().then(user => res.json(
                {
                    message: "success",
                    isSuccess: true,
                    code: 200,
                    data: user
                })).catch(e => res.json(
                    {
                        isSuccess: false,
                        message: e.message,
                        code: 404
                    }))
        }).catch(e => res.json({
            isSuccess: false,
            message: e.message,
            code: 404
        }))
    }


    //get 
    getUser(req, res) {
        if (req.query.gmail == null) {
            res.json({
                isSuccess: false,
                message: "Cần truyền param gmail",
                code: 404
            })
        }
        User.findOne({ gmail: req.query.gmail }).then(user => {
            res.json({
                message: "success",
                isSuccess: true,
                code: 200,
                data: user
            })
        }).catch(e => res.json({
            isSuccess: false,
            message: e.message,
            code: 404
        }))
    }

    //GET /
    async index(req, res) {
        User.find({}).sort({ mark: -1 }).then(user => {
            var arr = []
            for (var i of user) {
                var obj = new UserMD(i.gmail, i.mark, i.username, i.imageUrl, i._id)
                arr.push(obj)
            }

            res.render('user', { user: arr, totalUser: user.length })
        }).catch(e => {
            res.render('404')
        })

    }

    async userDetail(req, res) {


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
        var user = await User.findOne({ _id: req.query.userId })
        var u = {
            username: user.username,
            gmail: user.gmail,
            imageUrl: user.imageUrl
        }
        var listTime = '';
        var score = ''
        for (var i = 0; i < 7; i++) {
            var milisecond = 1000 * 60 * 60 * 24 * i
            var dayWork = nowToMilisen - milisecond //tính khoảng cách hiện tại tới ngày thứ 'i'
            var day = new Date(dayWork) // trả về datetime: yyyy-MM-dd hh:mm:ss
            var dayFomarted = day.getUTCFullYear() + "/" + (day.getUTCMonth() + 1) + "/" + day.getUTCDate(); // format datetime: yyyy-MM-dd
            try {
                var process = await Process.find({ userId: req.query.userId, lastModify: dayFomarted })
                if (process.length > 0) {
                    var sumScore = 0
                    for (var j of process) {
                        sumScore += Number(j.quizMarked)
                    }
                    listTime += dayFomarted + '-'
                    score += sumScore.toString() + '-'
                } else {
                    listTime += dayFomarted + '-'
                    score += '0' + '-'
                }
            } catch (e) {
                res.json({
                    isSuccess: false,
                    message: e.message,
                    code: 404
                })
            }
        }
        var listDaHoc = []
        var totalScore = 0
        try {
            var prc = await Process.find({ userId: req.query.userId }).sort({ quizMarked: -1 })
            for (var v of prc) {
                totalScore += Number(v.quizMarked)
                var ls = await Lesson.findOne({ _id: v.lessonId })
                if (ls != null) {
                    listDaHoc.push({
                        title: ls.title,
                        score: v.quizMarked,
                        topic: v.completed.length.toString() + '/' + ls.totalTopic,
                        lastModify: v.lastModify
                    })
                }
            }
        } catch (e) {
            res.json({
                mess: e.message
            })
        }
        res.render('user_detail', { listTime: listTime, score: score, user: u, daHoc: listDaHoc, totalScore: totalScore })
    }

    //get lesson đã học
    async getTop10Lesson(req, res) {
        if (req.query.userId == null) {
            res.json({
                message: 'Cần truyền userId',
                status: false
            })
            return
        }
        try {
            var listDaHoc = []
            var prc = await Process.find({ userId: req.query.userId }).sort({ quizMarked: -1 })
            for (var v of prc) {
                var ls = await Lesson.findOne({ _id: v.lessonId })
                if (ls != null) {
                    listDaHoc.push({
                        title: ls.title,
                        score: v.quizMarked,
                        topic: v.completed.length.toString() + '/' + ls.totalTopic,
                        date: v.lastModify,
                    })
                }
                if (prc.indexOf(v) == 9) {
                    break
                }
            }
            res.json({
                isSuccess: true,
                code: 200,
                data: listDaHoc
            })
        } catch (e) {
            res.json({
                mess: e.message
            })
        }
    }
    //get top N user:
    getTopUser(req, res) {
        if (req.query.topUser == null) {
            User.find({}).sort({ mark: -1 }).then(users => {
                var arr = []
                for (var i of users) {
                    arr.push({
                        _id: i._id,
                        gmail: i.gmail,
                        username: i.username,
                        imageUrl: i.imageUrl,
                        mark: i.mark,
                        top: users.indexOf(i) + 1
                    })
                }
                res.json({
                    message: "success",
                    isSuccess: true,
                    code: 200,
                    data: arr
                })
                return
            }).catch(e => {
                res.json({
                    isSuccess: false,
                    message: e.message,
                    code: 404
                })
            })
        } else {
            User.find({}).limit((Number(req.query.topUser))).sort({ mark: -1 }).then(users => {
                var arr = []
                for (var i of users) {
                    arr.push({
                        _id: i._id,
                        gmail: i.gmail,
                        username: i.username,
                        imageUrl: i.imageUrl,
                        mark: i.mark,
                        top: users.indexOf(i) + 1
                    })
                }
                res.json({
                    message: "success",
                    isSuccess: true,
                    code: 200,
                    data: arr
                })
                return
            }).catch(e => {
                res.json({
                    isSuccess: false,
                    message: e.message,
                    code: 404
                })
            })
        }

    }

    //get top user từ process collection
    async getRank(req, res) {
        if (req.query.topUser == null) {
            res.json({
                message: "Cần truyền topUser",
                status: false
            })
            return
        }
        try {
            //get all process list
            var process = await Process.find({})
            var data = new Map()

            //tỉnh tổng điểm của từng user, lưu id, điểm vào map
            for (var i of process) {
                if (!data.has(i.userId)) {
                    data.set(i.userId, i.quizMarked)
                } else {
                    var temp = data.get(i.userId) + Number(i.quizMarked)
                    data.set(i.userId, temp)
                }
            }
            data.delete('');
            console.log(data)

            //sort map theo điểm từ cao xuống thấp
            const dataSorted = new Map([...data.entries()].sort((a, b) => b[1] - a[1]));
            var response = []
            var listKey = []
            var listValue = []

            dataSorted.forEach((value, key) => {
                listKey.push(key)
                listValue.push(value)
            })
            var j = 0
            var i = 0

            //lấy thông tin user, trả về json
            while (i < req.query.topUser) {
                try {
                    var u = await User.findOne({ _id: listKey[i] })
                    if (u != null) {
                        j++;
                        response.push({
                            _id: u._id,
                            gmail: u.gmail,
                            username: u.username,
                            imageUrl: u.imageUrl,
                            mark: dataSorted.get(listKey[i]),
                            top: j
                        })
                    }
                    if ((Number(i) + 1) == req.query.topUser || i > listKey.length) {
                        res.json({
                            message: "success",
                            isSuccess: true,
                            code: 200,
                            data: response
                        })
                        i = (req.query.topUser)
                    }
                    i++
                } catch (e) {
                    res.json({
                        isSuccess: false,
                        message: e.message,
                        code: 404
                    })
                }
            }
        } catch (e) {
            res.json({
                isSuccess: false,
                message: e.message,
                code: 404
            })
        }

    }


}

class UserMD {
    gmail
    mark
    username
    imageUrl
    _id

    constructor(gmail, mark, username, imageUrl, _id) {
        this.gmail = gmail
        this.mark = mark
        this.username = username
        this.imageUrl = imageUrl
        this._id = _id
    }
}

module.exports = new UserController()