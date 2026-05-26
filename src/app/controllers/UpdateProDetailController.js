const ProgramDetail = require('../model/ProgramDetailModel')

class UpdateProController {
    //hiển thị view update topic:
    index(req, res) {
        if (req.query.questionId == null) {
            res.send('Cần truyền Id')
            return
        }
        ProgramDetail.findOne({_id: req.query.questionId}).then(program => {
            var obj = { programId: program.programId, _id: program._id, title: program.title, content: program.content }
            res.render('update_program_detail', { program: obj })
        }).catch(e => res.send('Lỗi ' + e.message))
    }

    // update topic
    async updateProgram(req, res, next) {
        if (req.body.id == null) {
            res.send('Cần truyền Id')
            return
        }
            ProgramDetail.findOne({ _id: req.body.id }).then(program => {
                if (program != null) {
                    program.title = req.body.title
                    program.content = req.body.content
                    program.save().then(topic => {
                        res.redirect('/program_detail?programId=' + program.programId)
                    }).catch(e => res.send('Có lỗi' )+e.message)
                }else{
                    res.send('Null r ban')
                }
            }).catch(e => res.send('Loi '+e.message))
    }
}


module.exports = new UpdateProController()