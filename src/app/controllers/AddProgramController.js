const path = require('path')
const Program = require('../model/ProgramModel')
const ProgramDetail = require('../model/ProgramDetailModel')
const xlsx = require('xlsx');
const fs = require('fs')


class AddProgramController {
    index(req, res) {
        res.render('add_program')
    }

    async importProgram(req, res, next) {
        const excelFiles = req.files && req.files['excel_file']
        if (!excelFiles || excelFiles.length === 0) {
            return res.status(400).json({ message: 'Thiếu file Excel (excel_file)' })
        }

        try {
            const workbook = xlsx.readFile(excelFiles[0].path)
            const sheetNames = workbook.SheetNames
            if (sheetNames.length < 2) {
                return res.send('<center><h2 style="color:red">File cần có 2 sheet: Sheet 1 = danh sách chương (cột name), Sheet 2 = bài học (cột program_id hoặc program_name, title, content)</h2></center>')
            }

            const normalizeCols = (rows) => rows.map(r => {
                const obj = {}
                for (const k of Object.keys(r)) obj[k.toLowerCase().trim()] = r[k]
                return obj
            })
            const programRows = normalizeCols(xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[0]]))
            const detailRows = normalizeCols(xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[1]]))

            if (!programRows.length) {
                return res.send('<center><h2 style="color:red">Sheet 1 không có dữ liệu chương</h2></center>')
            }

            // Pre-load programs đã có để tránh trùng
            const existingPrograms = await Program.find({}, { name: 1 })
            const existingByName = new Map(existingPrograms.map(p => [String(p.name).trim(), p]))

            // Pre-load details để tránh trùng
            const existingDetails = await ProgramDetail.find({}, { programId: 1, title: 1 })
            const existingDetailTitles = new Map()
            for (const d of existingDetails) {
                const key = String(d.programId)
                if (!existingDetailTitles.has(key)) existingDetailTitles.set(key, new Set())
                existingDetailTitles.get(key).add(String(d.title).trim())
            }

            // Kiểm tra detail row có key tham chiếu đến chương không
            const hasRef = detailRows.some(r => r.program_id != null || r.program_name != null || r.programid != null)

            let created = 0, updated = 0, skipped = 0, detailsAdded = 0

            for (let i = 0; i < programRows.length; i++) {
                const pRow = programRows[i]
                const name = pRow.name != null ? String(pRow.name).trim() : ''
                if (!name) { skipped++; continue }

                // Lọc details thuộc chương này
                const rowKey = pRow.id != null ? String(pRow.id).trim() : String(i + 1)
                const detailsForProgram = detailRows.filter(d => {
                    if (!hasRef) return true // 1 chương duy nhất → tất cả details
                    const ref = d.program_id ?? d.programid ?? d.program_name
                    if (ref == null) return false
                    const refStr = String(ref).trim()
                    return refStr === rowKey || refStr === name
                })

                if (detailsForProgram.length === 0) { skipped++; continue }

                let program = existingByName.get(name)
                const isNew = !program
                if (!program) {
                    program = await Program({ name, image: '' }).save()
                    existingByName.set(name, program)
                }

                const existingTitles = existingDetailTitles.get(String(program._id)) ?? new Set()
                const localTitles = new Set(existingTitles)

                const toInsert = []
                for (const d of detailsForProgram) {
                    const title = d.title != null ? String(d.title).trim() : ''
                    if (!title || localTitles.has(title)) continue
                    toInsert.push({
                        programId: program._id,
                        title: d.title,
                        content: d.content ?? '',
                        videoUrl: d.videourl ?? d.videoUrl ?? d.video_url ?? '',
                    })
                    localTitles.add(title)
                }

                if (toInsert.length > 0) {
                    await ProgramDetail.insertMany(toInsert, { ordered: false })
                    detailsAdded += toInsert.length
                    if (isNew) created++; else updated++
                } else {
                    skipped++
                }
            }

            if (created === 0 && detailsAdded === 0) {
                return res.send(`<center><h2 style="color:red">Không import được dữ liệu nào (${skipped} chương bị bỏ qua hoặc đã tồn tại)</h2></center>`)
            }

            res.redirect(`/programs.html?imported=${created}&updated=${updated}&details=${detailsAdded}&skipped=${skipped}`)
        } catch (e) {
            res.json({ success: false, message: 'Import thất bại', error: e.message })
        }
    }

}


module.exports = new AddProgramController();