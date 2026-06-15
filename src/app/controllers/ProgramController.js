const Program = require('../model/ProgramModel')
const ProgramDetail = require('../model/ProgramDetailModel')
const path = require('path')
const ProgramDetailModel = require('../model/ProgramDetailModel')
class ProgramController {
    async index(req, res) {
        try {
            const programs = await Program.find({})
            const listProgram = []
            for (const i of programs) {
                const totalTopic = await ProgramDetail.countDocuments({ programId: i._id })
                listProgram.push(new ProgramMD(i.name, i._id, totalTopic))
            }
            res.render('programs', { program: listProgram })
        } catch (e) {
            res.json({ status: false, message: 'Lỗi', error: e.message })
        }
    }

    deleteProgram(req, res, next) {
        if (req.body.id == null) {
            res.json({ message: 'Cần truyền params id', isSuccess: false })
            return
        }
        Program.deleteOne({ _id: req.body.id }, function (err) {
            if (err) {
                res.json({ message: 'Delete failed', isSuccess: false })
                return
            }
            ProgramDetail.deleteMany({ programId: req.body.id }, function (err) {
                if (err) {
                    res.json({ message: 'Delete failed', isSuccess: false })
                    return
                }
            })
        })
        res.redirect('/programs.html')
    }

}


class ProgramMD {
    title
    _id
    totalTopic
    constructor(title, _id, totalTopic) {
        this.title = title
        this._id = _id
        this.totalTopic = totalTopic
    }
}


module.exports = new ProgramController()
