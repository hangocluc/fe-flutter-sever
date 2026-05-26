const mongoose = require('mongoose')
const QA = require('../model/QAModel')
const { resolveUserContact } = require('../helpers/userContact')

function isValidQuestionObjectId(id) {
    if (!id) return false
    return mongoose.Types.ObjectId.isValid(String(id)) &&
        /^[a-f0-9]{24}$/i.test(String(id))
}

class QAController {
    index(req, res) {
        QA.find()
            .sort({ createdAt: -1 })
            .then((qa) => {
                const arrQiz = []
                const arrSystem = []
                let pendingLesson = 0

                for (const i of qa) {
                    const row = new Pending(
                        i.userId,
                        i.title,
                        i.user,
                        i.content,
                        i._id,
                        i.status,
                        i.idQuestionId,
                        i.type,
                        i.lessonId,
                        i.createdAt,
                        {},
                        i.category,
                        i.platform
                    )
                    if (i.type === true || i.type === 'true' || i.type === 1) {
                        arrQiz.push(row)
                        if (!i.status) pendingLesson += 1
                    } else {
                        arrSystem.push(row)
                    }
                }

                res.render('pending_request', {
                    QIZ: arrQiz,
                    SYTEM: arrSystem,
                    pendingLessonCount: pendingLesson,
                    systemCount: arrSystem.length,
                    lessonCount: arrQiz.length,
                })
            })
            .catch((e) => res.send('Loi ' + e.message))
    }

    insertLessonFeedback(req, res) {
        const content = (
            req.body.content ||
            req.body.message ||
            req.body.feedback ||
            ''
        ).trim()
        const idQuestionId = String(
            req.body.idQuestionId ||
            req.body.questionId ||
            req.body.quizId ||
            ''
        ).trim()
        const userId = String(
            req.body.userId ||
            req.body.gmail ||
            req.body.email ||
            ''
        ).trim()
        const user = String(
            req.body.user ||
            req.body.username ||
            req.body.name ||
            userId
        ).trim()
        const lessonId = String(
            req.body.lessonId ||
            req.body.lesson_id ||
            ''
        ).trim()
        const title =
            (req.body.title && String(req.body.title).trim()) ||
            'Lesson question feedback'

        if (!content) {
            res.status(400).json({
                message: 'content (hoặc message) không được trống',
                isSuccess: false,
                code: 400,
            })
            return
        }

        if (!userId && !user) {
            res.status(400).json({
                message: 'Cần userId/gmail hoặc user/username',
                isSuccess: false,
                code: 400,
            })
            return
        }

        QA({
            userId: userId || user,
            user,
            title,
            content,
            idQuestionId,
            lessonId,
            type: true,
            status: false,
        })
            .save()
            .then((doc) =>
                res.json({
                    message: 'Feedback submitted successfully',
                    code: 200,
                    isSuccess: true,
                    data: doc,
                })
            )
            .catch((e) =>
                res.status(500).json({
                    message: e.message,
                    code: 500,
                    isSuccess: false,
                })
            )
    }

    insertSystemFeedback(req, res) {
        const message = String(
            req.body.message ||
            req.body.content ||
            req.body.feedback ||
            ''
        ).trim()
        const userId = String(
            req.body.userId ||
            req.body.gmail ||
            req.body.email ||
            ''
        ).trim()
        const user = String(
            req.body.user ||
            req.body.username ||
            req.body.name ||
            userId
        ).trim()
        const category = String(req.body.category || 'general').trim()
        const platform = String(req.body.platform || '').trim()
        const title =
            (req.body.title && String(req.body.title).trim()) ||
            `System feedback: ${category}`

        if (!message) {
            res.status(400).json({
                message: 'message is required',
                isSuccess: false,
                code: 400,
            })
            return
        }

        if (!userId && !user) {
            res.status(400).json({
                message: 'userId or user is required',
                isSuccess: false,
                code: 400,
            })
            return
        }

        QA({
            userId: userId || user,
            user,
            title,
            content: message,
            category,
            platform,
            type: false,
            status: false,
        })
            .save()
            .then((doc) =>
                res.json({
                    message: 'System feedback submitted successfully',
                    code: 200,
                    isSuccess: true,
                    data: doc,
                })
            )
            .catch((e) =>
                res.status(500).json({
                    message: e.message,
                    code: 500,
                    isSuccess: false,
                })
            )
    }

    //
    //addd
    addQA(req, res) {
        if (req.body.userId == null || req.body.user == null || req.body.content == null) {
            res.json({
                message: 'Cần truyền userId và content, title',
                isSuccess: false
            })
            return
        }
        QA({
            userId: req.body.userId,
            user: req.body.user,
            title: req.body.title,
            content: req.body.content,
            idQuestionId: req.body.idQuestionId,
            type: req.body.type,
            status: req.body.status
        }).save().then(qa => res.json({
            message: "Thanh cong",
            code: 200,
            isSuccess: true,
            data: qa
        })).catch(e => res.json({
            message: e.message,
            code: 404,
            isSuccess: false
        }))
    }

    async updateQA(req, res) {
        const id = req.body.id
        if (!id) {
            res.status(400).json({ message: 'Missing feedback id', isSuccess: false })
            return
        }

        try {
            const qa = await QA.findById(id)
            if (!qa) {
                res.status(404).send('Feedback not found')
                return
            }

            qa.status = true
            await qa.save()

            const contact = await resolveUserContact(qa)
            if (contact.gmail) {
                res.redirect(
                    `/nextfeedback?email=${encodeURIComponent(contact.gmail)}&id=${id}`
                )
                return
            }

            res.redirect(`/detail_pending?id=${id}&resolved=1`)
        } catch (e) {
            console.error('updateQA failed:', e)
            res.status(500).send(e.message)
        }
    }

    deleteQA(req, res) {
        if (req.body.id == null) {
            res.json({ message: 'Cần truyền params id', status: false })
            return
        }
        QA.deleteOne({ _id: req.body.id }, function (err) {
            if (err) {
                res.json({ message: 'Delete failed', status: false, err: err })
                return
            }
            res.redirect('/pending_request')
        })
    }

    //todo by canhpd
    async deltailPending(req, res) {
        if (!req.query.id) {
            res.status(400).json({ message: 'id is required' })
            return
        }

        try {
            const rows = await QA.find({ _id: req.query.id })
            const list = []

            for (const i of rows) {
                const contact = await resolveUserContact(i)
                list.push(
                    new Pending(
                        i.userId,
                        i.title,
                        i.user,
                        i.content,
                        i._id,
                        i.status,
                        i.idQuestionId,
                        i.type,
                        i.lessonId,
                        i.createdAt,
                        contact,
                        i.category,
                        i.platform
                    )
                )
            }

            res.render('detail_pending', {
                QA: list,
                resolved: req.query.resolved === '1',
                email: req.query.email === '1',
                push: req.query.push === '1',
            })
        } catch (e) {
            res.status(500).json({ status: false, message: e.message })
        }
    }
}

class Pending {


    userId
    title
    user
    content
    _id
    status
    idQuestionId
    type


    constructor(
        userId,
        title,
        user,
        content,
        id,
        status,
        idQuestionId,
        type,
        lessonId,
        createdAt,
        contact = {},
        category = '',
        platform = ''
    ) {
        this.userId = userId
        this.title = title
        this.user = user
        this.content = content
        this._id = id
        this.status = status
        this.idQuestionId = idQuestionId
        this.type = type
        this.lessonId = lessonId || ''
        this.createdAt = createdAt
            ? new Date(createdAt).toLocaleString('en-US', {
                dateStyle: 'short',
                timeStyle: 'short',
            })
            : ''
        const looksLikeObjectId = (v) =>
            typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v)

        if (user && !looksLikeObjectId(user)) {
            this.displayName = user
            this.displaySub = userId && userId !== user ? userId : ''
        } else if (userId && !looksLikeObjectId(userId)) {
            this.displayName = userId
            this.displaySub = ''
        } else {
            this.displayName = user || 'App user'
            this.displaySub = userId ? shortenId(userId) : ''
        }

        this.shortQuestionId = shortenId(idQuestionId)
        this.shortLessonId = shortenId(lessonId)
        this.canEditQuestion = isValidQuestionObjectId(idQuestionId)
        this.category = category || ''
        this.platform = platform || ''
        this.replyEmail = contact.gmail || ''
        this.replyName = contact.username || ''
        this.canReply = Boolean(contact.gmail)
    }
}

function shortenId(value) {
    if (!value || typeof value !== 'string') {
        return ''
    }
    if (value.length <= 16) {
        return value
    }
    return `${value.slice(0, 8)}…${value.slice(-6)}`
}


module.exports = new QAController()