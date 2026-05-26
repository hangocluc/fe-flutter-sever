const Process = require('../model/ProcessModel')

class ProcessController {
    insertOrUpdate(req, res) {

        if (req.body.userId == null || req.body.lessonId == null) {
            res.json({
                code: 404,
                message: 'Thiếu params. Cần truyền ít nhất userId, lessonId',
                isSuccess: false
            })
            return
        }


        Process.findOne({
            userId: req.body.userId,
            lessonId: req.body.lessonId,
        }).then(process => {
            if (process == null) {
                var arr = []
                var today = new Date();
                var date = today.getFullYear() + '/' + (today.getMonth() + 1) + '/' + today.getDate();
                if (req.body.completed != null && req.body.completed != "")
                    arr.push(req.body.completed)
                Process({
                    userId: req.body.userId,
                    lessonId: req.body.lessonId,
                    completed: arr,
                    status: (req.body.status != null && req.body.status != '') ? req.body.status : -1,
                    quizStatus: (req.body.quizStatus != null && req.body.quizStatus != '') ? req.body.quizStatus : -1,
                    quizMarked: req.body.quizMarked,
                    dateTime: date,
                    lastModify: date
                }).save().then(pr => {
                    res.json({
                        code: 200,
                        message: 'Thành công',
                        isSuccess: true,
                        data: pr
                    })
                }).catch(e => res.json({
                    code: 404,
                    message: e.message,
                    isSuccess: false
                }))
            } else {
                //change value:
                if (req.body.completed != null && req.body.completed != "") {
                    // var arrParams = eval(req.body.completed);
                    var arrCompleted = process.completed;
                    // for (var i in arrParams) {
                    if (!process.completed.includes(req.body.completed.toString().trim()))
                        arrCompleted.push(req.body.completed.toString().trim())
                    // }
                    process.completed = arrCompleted
                }

                if (req.body.status != null && req.body.status != '') {
                    process.status = req.body.status
                }
                if (req.body.status == 0) {
                    process.status = 0
                }
                if (req.body.quizStatus == 0) {
                    process.quizStatus = 0
                }
                if (req.body.quizStatus != null && req.body.quizStatus != '') {
                    process.quizStatus = req.body.quizStatus
                }
                if (req.body.quizMarked != null) {
                    process.quizMarked = req.body.quizMarked
                }
                var today = new Date();
                var date = today.getFullYear() + '/' + (today.getMonth() + 1) + '/' + today.getDate();
                process.lastModify = date

                process.save().then(pro => {
                    res.json({
                        code: 200,
                        message: 'Thành công',
                        isSuccess: true,
                        data: pro
                    })
                }).catch(e => res.json({
                    code: 404,
                    message: e.message,
                    isSuccess: false
                }))

            }
        }).catch(e => {
            res.json({
                code: 404,
                message: e.message,
                isSuccess: false
            })
        })
    }

    getProcess(req, res) {
        if (req.query.userId == null || req.query.lessonId == null) {
            res.json({
                code: 404,
                message: 'Thiếu params. Cần truyền userId, lessonId',
                isSuccess: false
            })
        }
        Process.find({ lessonId: req.query.lessonId, userId: req.query.userId }).then(process => {
            res.json({
                code: 200,
                message: 'Thành công',
                isSuccess: true,
                data: process
            })
        }).catch(e => {
            res.json({
                code: 404,
                message: e.message,
                isSuccess: false
            })
        })
    }

    getProcessByUser(req, res) {
        if (req.query.userId == null) {
            res.json({
                code: 404,
                message: 'Thiếu params. Cần truyền userId',
                isSuccess: false
            })
        }
        Process.find({ userId: req.query.userId }).then(process => {
            res.json({
                code: 200,
                message: 'Thành công',
                isSuccess: true,
                data: process
            })
        }).catch(e => {
            res.json({
                code: 404,
                message: e.message,
                isSuccess: false
            })
        })
    }
}




module.exports = new ProcessController()