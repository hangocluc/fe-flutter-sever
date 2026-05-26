
const ProgramDetailModel = require('../model/ProgramDetailModel');
const Question = require('../model/QuestionModel');

class ProgramDetailController {

    //Get /
    index(req, res) {
        if (req.query.programId == null) {
            res.json({ message: 'ProgramId không được trống' })
            return
        }
        ProgramDetailModel.find({ programId: req.query.programId }).then(program => {
            var listProgramDetail = []
            for (var i of program) {
                var pr = new ProgramDetailMD(i.content, i.title, i._id, req.query.programId)
                listProgramDetail.push(pr)
            }
            res.render('program_detail', { program: listProgramDetail });
        }).catch(e => res.json({ status: false, message: 'Lỗi', error: e.message }))
    }


    //delete topic:
    async deleteProgramDetail(req, res, next) {
        if (req.body.id == null) {
            res.json({ message: 'Cần truyền params id', status: false })
            return
        }
        ProgramDetailModel.deleteOne({ _id: req.body.id }, function (err) {
            if (err) {
                res.json({ message: 'Delete failed', isSuccess: false, err: err.message })
                return
            }
        })
        res.redirect('/program_detail?programId=' + req.body.programId)
    }

    
 
}


class ProgramDetailMD {
    content
    title
    programId
    _id
    constructor(content, title, _id, programId) {
        this.content = content
        this.title = title
        this._id = _id
        this.programId = programId
    }
}

module.exports = new ProgramDetailController()
