const mongoose = require('mongoose')
const Question = require('../model/QuestionModel')
const Lesson = require('../model/LessonModel')

function isValidObjectId(id) {
    if (!id) return false
    return mongoose.Types.ObjectId.isValid(String(id)) &&
        /^[a-f0-9]{24}$/i.test(String(id))
}

function mapQuestionToForm(ques) {
    let cr = ''
    if (ques.correctAnswer == 1 || ques.correctAnswer === '1') cr = 'A'
    else if (ques.correctAnswer == 2 || ques.correctAnswer === '2') cr = 'B'
    else if (ques.correctAnswer == 3 || ques.correctAnswer === '3') cr = 'C'
    else if (ques.correctAnswer == 4 || ques.correctAnswer === '4') cr = 'D'

    const answers = Array.isArray(ques.answer) ? ques.answer : []

    return {
        id: ques._id,
        question: ques.question,
        anA: answers[0] || '',
        anB: answers[1] || '',
        anC: answers[2] || '',
        anD: answers[3] || '',
        correct: cr,
    }
}

class UpdateQuestionController {
    //show view
    index(req, res) {
        if (req.query.id == null) {
            res.send('Cần truyền Id')
        }
        Question.findOne({_id: req.query.id}).then(ques => {
            var cr = '';
            if (ques.correctAnswer == 1) {
                cr = 'A';
            } else if (ques.correctAnswer == 2) {
                cr = 'B';
            } else if (ques.correctAnswer == 3) {
                cr = 'C';
            } else if (ques.correctAnswer == 4) {
                cr = 'D';
            } else {
                cr = ''
            }
            var a = {
                id: ques._id,
                question: ques.question,
                anA: ques.answer[0],
                anB: ques.answer[1],
                anC: ques.answer[2],
                anD: ques.answer[3],
                correct: cr
            }

            res.render('update_question', {ques: a})
        }).catch(e => res.json(e.message))
    }

    //update
    updateQuestion(req, res) {
        if (req.body.id == null) {
            res.json({message: 'Cần truyền params id', status: false})
            return
        }
        Question.findOne({_id: req.body.id}).then(question => {
            if (question != null) {
                var arr = []
                if (req.body.aA != null && req.body.aA.toString().trim() != '') {
                    arr.push(req.body.aA);
                }
                if (req.body.aB != null && req.body.aB.toString().trim() != '') {
                    arr.push(req.body.aB);
                }
                if (req.body.aC != null && req.body.aC.toString().trim() != '') {
                    arr.push(req.body.aC);
                }
                if (req.body.aD != null && req.body.aD.toString().trim() != '') {
                    arr.push(req.body.aD);
                }
                var cr = question.correctAnswer
                if (req.body.correct == 'A') {
                    cr = 1
                } else if (req.body.correct == 'B') {
                    cr = 2
                } else if (req.body.correct == 'C') {
                    cr = 3
                } else if (req.body.correct == 'D') {
                    cr = 4
                } else {
                    res.send('Correct answer is A,B,C or D')
                    return
                }
                question.question = req.body.question
                question.answer = arr
                question.correctAnswer = cr

                question.save().then(topic => {
                    res.redirect('/lesson.html')
                }).catch(e => res.send('Có lỗi'))
            } else {
                res.send('null roi bạn oi')
            }
        }).catch(e => res.send(e.message))


    }

//todo by canhnamdinh

    async loadIndext(req, res) {
        const questionId = req.query.questionId
        const backUrl = req.query.idQA
            ? `/detail_pending?id=${req.query.idQA}`
            : '/pending_request'

        if (!questionId) {
            res.status(400).send('Missing questionId')
            return
        }

        if (!isValidObjectId(questionId)) {
            res.status(400).send(
                `Invalid question ID "${questionId}". ` +
                `This feedback may be test data — need a real Question _id from MongoDB (24 hex chars). ` +
                `<a href="${backUrl}">Back</a>`
            )
            return
        }

        try {
            const ques = await Question.findById(questionId)
            if (!ques) {
                res.status(404).send(
                    `Question not found for id ${questionId}. ` +
                    `<a href="${backUrl}">Back to feedback</a>`
                )
                return
            }

            res.render('update_questionv2', {
                ques: mapQuestionToForm(ques),
                idQA: req.query.idQA || '',
                user: req.query.user || '',
                backUrl,
            })
        } catch (e) {
            console.error('loadIndext failed:', e)
            res.status(500).send(`${e.message} <a href="${backUrl}">Back</a>`)
        }
    }


}


module.exports = new UpdateQuestionController()