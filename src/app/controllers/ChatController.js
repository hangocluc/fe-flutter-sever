const Chat = require('../model/ChatModel')
const User = require('../model/UserModel')

class ChatController {
    index(req, res) {
        Chat.find({ questionId: req.query.questionId }).then(chats => {
            var arr = []
            for (var i of chats) {
                arr.push({
                    questionId: i.questionId,
                    userId: i.userId,
                    username: i.username,
                    imageUrl: i.imageUrl,
                    quizId: i.quizId,
                    vote: i.vote,
                    message: i.message,
                    date: i.date
                })
            }
            res.render('discussion', { chat: arr })
        }).catch(e => res.render('Có lỗi ' + e.message))
    }

    addComment(req, res) {
        if (req.body.questionId == null ||
            req.body.userId == null ||
            req.body.quizId == null ||
            req.body.message == null ||
            req.body.date == null) {
            res.json({
                message: 'Cần truyền questionId, userId, quizId, message, date'
            })
            return
        }
        Chat({
            questionId: req.body.questionId,
            userId: req.body.questionId,
            quizId: req.body.quizId,
            vote: req.body.vote,
            isLike: false,
            message: req.body.message,
            date: req.body.date,
        }).save().then(chat => {
            res.json({
                message: 'Thành công',
                code: 200,
                isSuccess: true,
                data: chat
            })
        }).catch(e => {
            res.json({
                message: e.message,
                code: 404,
                isSuccess: false,
            })
        })
    }

    updateComment(req, res) {
        // sai
        if (req.body.userId == null) {
            res.json({
                message: 'Cần truyền id, userId'
            })
            return
        }

        Chat.findOne({ _id: req.body.id }).then(chat => {
            if (chat != null) {
                if (req.body.id == '') {
                    return
                }
                var arr = chat.userLiked
                if (chat.userLiked.includes(req.body.userId)) {
                    chat.vote = Number(chat.vote) - 1

                    var index = arr.indexOf(req.body.userId);
                    if (index > -1) {
                        arr.splice(index, 1);
                    }
                } else {
                    chat.vote = Number(chat.vote) + 1
                    arr.push(req.body.userId)
                }
                chat.userLiked = arr
                chat.save().then(c => {
                    Chat.find({ questionId: c.questionId }).then(chats => {
                        res.json({
                            message: 'Thành công',
                            code: 200,
                            isSuccess: true,
                            data: chats
                        })
                    }).catch(e => res.json({
                        message: e.message,
                        code: 404,
                        isSuccess: false,
                    }))

                }).catch(e => res.json({
                    message: e.message,
                    code: 404,
                    isSuccess: false,
                }))
            }
        }).catch(e => res.json({
            message: e.message,
            code: 404,
            isSuccess: false
        }))
    }


    deleteChat(req, res) {
        if (req.body.id == null) {
            res.json({ message: 'Cần truyền params id', status: false })
            return
        }
        Chat.deleteOne({ _id: req.body.id }, function (err) {
            if (!err) {
                res.json({
                    message: 'Xoa thành công',
                    code: 200,
                    isSuccess: true,
                })
                return
            } else {
                res.json({ message: err.message, status: false, code: 400 })
            }

        })

    }

    async getChatByQuestion(req, res) {
        if (req.query.questionId == null) {
            res.json({ message: 'Cần truyền params questionId', status: false })
            return
        }

        var chats = await Chat.find({ questionId: req.query.questionId })

        // .catch(e => res.json({
        //     message: e.message,
        //     code: 404,
        //     isSuccess: false,
        // }))
        var data = []
        for (var i of chats) {
            var u = await User.findOne({ _id: i.userId })
            // .catch(e => res.json({
            //     message: e.message,
            //     code: 404,
            //     isSucces: false
            // }))
            data.push({
                _id: i._id,
                questionId: i.questionId,
                quizId: i.quizId,
                imageUrl: i.imageUrl,
                vote: i.vote,
                message: i.message,
                date: i.date,
                user: u
            })
        }
        res.json({
            isSucces: true,
            code: 200,
            message: "Thành công",
            data: data
        })
    }

    getChatByQuestionId(req, res) {
        if (req.query.questionId == null) {
            res.json({ message: 'Cần truyền params questionId', status: false })
            return
        }

        Chat.find({ questionId: req.query.questionId }).then(chats => {
            res.json({
                message: 'Thành công',
                code: 200,
                isSuccess: true,
                data: chats
            })
        }).catch(e => res.json({
            message: e.message,
            code: 404,
            isSuccess: false,
        }))
    }

    getChatByQuiz(req, res) {
        if (req.query.quizId == null) {
            res.json({ message: 'Cần truyền params quizId', status: false })
            return
        }
        Chat.find({ quizId: req.query.quizId }).then(chats => {
            res.json({
                message: 'Thành công',
                code: 200,
                isSuccess: true,
                data: chats
            })
        }).catch(e => res.json({
            message: e.message,
            code: 404,
            isSuccess: false,
        }))
    }

    getAllChat(req, res) {
        Chat.find({}).then(chats => {
            res.json({
                message: 'Thành công',
                code: 200,
                isSuccess: true,
                data: chats
            })
        }).catch(e => res.json({
            message: e.message,
            code: 404,
            isSuccess: false,
        }))
    }
}

module.exports = new ChatController()