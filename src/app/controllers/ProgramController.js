const Program = require('../model/ProgramModel')
const ProgramDetail = require('../model/ProgramDetailModel')
const path = require('path')
const ProgramDetailModel = require('../model/ProgramDetailModel')
class ProgramController {
    index(req, res) {
        Program.find({}).then(
            program => {
                var listProgram = []
                for (var i of program) {
                    var pr = new ProgramMD(i.image, i.name, i._id)
                    listProgram.push(pr)
                }
                res.render('programs', { program: listProgram });
            }).catch(e => res.json({ status: failed, message: 'Lỗi', error: e.message }))
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
    image
    title
    _id
    constructor(image, title, _id) {
        this.image = image
        this.title = title
        this._id = _id
    }
}


module.exports = new ProgramController()
