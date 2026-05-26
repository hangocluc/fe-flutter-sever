const path = require('path')
const Lesson = require('../model/LessonModel')
const xlsx = require('xlsx');
const Topic = require('../model/TopicModel')
const Quiz = require('../model/QuizModel')
const Question = require('../model/QuestionModel')
const Process = require('../model/ProcessModel')
const User = require('../model/UserModel');
const UserModel = require('../model/UserModel');

class LessonController {
    async index(req, res) {
        var a = await Lesson.aggregate([
            {
                $lookup: {
                    from: "processes",       // other table name
                    localField: "_id",   // name of users table field
                    foreignField: "lessonId", // name of userinfo table field
                    as: "process"         // alias for userinfo table
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    totalTopic: 1,
                    count: { $size: "$process" },
                }
            }
        ]);
        res.render('lesson', { lesson: a });
    }

    async userLearned(req, res) {
        var process = await Process.find({ lessonId: req.query.lessonId }, { _id: 0, quizMarked: 1, userId: 1, lastModify: 1 }).sort({ quizMarked: -1 });
        var listData = [];
        for (var i of process) {
            var u = await UserModel.findOne({ _id: i.userId });
            if (u != null) {
                listData.push({
                    userId: i.userId,
                    mark: i.quizMarked,
                    username: u.username,
                    date: i.lastModify,
                    avatar: u.imageUrl
                })
            }
        }
        res.render('user-learned', { user: listData })

    }

  // Sheet Topics / Questions: lesson_id tham chiếu cột id của sheet Lesson.
  _topicLessonKey(row) {
    const key =
      row.lesson_id ??
      row.lessonId ??
      row.lessonTitle ??
      row.lesson ??
      row.chapter;
    if (key == null || String(key).trim() === '') {
      return null;
    }
    return String(key).trim();
  }

  // Sheet Lesson: khóa id (1, 2, 3...); không có id thì dùng thứ tự dòng.
  _lessonRowKey(lessonRow, lessonIndex) {
    const key =
      lessonRow.id ??
      lessonRow.lesson_id ??
      lessonRow.lessonId ??
      lessonRow.chapterId;
    if (key != null && String(key).trim() !== '') {
      return String(key).trim();
    }
    return String(lessonIndex + 1);
  }

  _rowBelongsToLesson(row, lessonRow, lessonIndex) {
    const topicKey = this._topicLessonKey(row);
    if (topicKey == null) {
      return false;
    }
    const lessonKey = this._lessonRowKey(lessonRow, lessonIndex);
    if (topicKey === lessonKey) {
      return true;
    }
    const title =
      lessonRow.title != null ? String(lessonRow.title).trim() : '';
    return title !== '' && topicKey === title;
  }

  _buildAnswers(row) {
    const arr = [];
    if (row.answerA != null && row.answerA.toString().trim() !== '') {
      arr.push(row.answerA);
    }
    if (row.answerB != null && row.answerB.toString().trim() !== '') {
      arr.push(row.answerB);
    }
    if (row.answerC != null && row.answerC.toString().trim() !== '') {
      arr.push(row.answerC);
    }
    if (row.answerD != null && row.answerD.toString().trim() !== '') {
      arr.push(row.answerD);
    }
    return arr;
  }

  // correctAnswer: chữ đầy đủ, hoặc A/B/C/D / 1-4 → map sang nội dung đáp án.
  _resolveCorrectAnswer(raw, answers) {
    if (raw == null) {
      return '';
    }
    const text = String(raw).trim();
    if (!text) {
      return '';
    }

    for (const a of answers) {
      if (a != null && String(a).trim() === text) {
        return String(a).trim();
      }
    }

    const letterIndex = { A: 0, B: 1, C: 2, D: 3 }[text.toUpperCase()];
    if (
      letterIndex !== undefined &&
      answers[letterIndex] != null &&
      String(answers[letterIndex]).trim() !== ''
    ) {
      return String(answers[letterIndex]).trim();
    }

    const num = Number.parseInt(text, 10);
    if (
      !Number.isNaN(num) &&
      num >= 1 &&
      num <= answers.length &&
      answers[num - 1] != null
    ) {
      return String(answers[num - 1]).trim();
    }

    return text;
  }

  _topicVideoLink(row) {
    const link = row.videoLink ?? row.video_link ?? row.video;
    if (link == null) {
      return '';
    }
    return String(link).trim();
  }

  // Sheet 1 Lesson: id, title, quizName
  // Sheet 2 Topics: lesson_id → Lesson.id, title, content, videoLink
  // Sheet 3 Questions: lesson_id → Lesson.id, question, answerA-D, correctAnswer (chữ đầy đủ)
  async importLessonFromExcelFile(req, res, next) {
    const workbook = xlsx.readFile(req.file.path);
    const sheetNames = workbook.SheetNames;
    if (sheetNames.length < 1) {
      res.send('<h1>File sai định dạng: cần ít nhất 1 sheet (danh sách chương)</h1>');
      return;
    }

    try {
      const lessonRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[0]]);
      if (!lessonRows.length) {
        res.send('<h1>Sheet 1 không có dữ liệu</h1>');
        return;
      }

      const topicRows = sheetNames.length >= 2
        ? xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[1]])
        : [];
      const questionRows = sheetNames.length >= 3
        ? xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[2]])
        : [];

      const hasLessonKeyOnTopics = topicRows.some(
        (r) => this._topicLessonKey(r) != null,
      );
      const hasLessonKeyOnQuestions = questionRows.some(
        (r) => this._topicLessonKey(r) != null,
      );
      const multiLesson = lessonRows.length > 1;

      const existingLessons = await Lesson.find({}, { title: 1 });
      const existingTitles = new Set(
        existingLessons.map((l) => String(l.title).trim()),
      );

      let created = 0;
      let skipped = 0;

      for (let lessonIndex = 0; lessonIndex < lessonRows.length; lessonIndex++) {
        const row = lessonRows[lessonIndex];
        const title = row.title != null ? String(row.title).trim() : '';
        if (!title) {
          continue;
        }
        if (existingTitles.has(title)) {
          skipped += 1;
          continue;
        }

        const topicsForLesson = topicRows.filter((t) => {
          if (multiLesson && hasLessonKeyOnTopics) {
            return this._rowBelongsToLesson(t, row, lessonIndex);
          }
          if (!multiLesson) {
            return true;
          }
          return false;
        });

        const newLesson = await Lesson({
          title,
          totalTopic: topicsForLesson.length,
        }).save();

        const quizName =
          row.quizName != null && String(row.quizName).trim() !== ''
            ? String(row.quizName).trim()
            : `Quiz ${title}`;

        const newQuiz = await Quiz({
          lessonId: newLesson._id,
          name: quizName,
        }).save();

        for (const t of topicsForLesson) {
          await Topic({
            lessonId: newLesson._id,
            title: t.title,
            content: t.content,
            videoLink: this._topicVideoLink(t),
          }).save();
        }

        const questionsForLesson = questionRows.filter((q) => {
          if (multiLesson && hasLessonKeyOnQuestions) {
            return this._rowBelongsToLesson(q, row, lessonIndex);
          }
          if (!multiLesson) {
            return true;
          }
          return false;
        });

        let questionOrder = 0;
        for (const q of questionsForLesson) {
          questionOrder += 1;
          const answers = this._buildAnswers(q);
          await Question({
            quizId: newQuiz._id,
            STT:
              q.STT != null && String(q.STT).trim() !== ''
                ? Number(q.STT)
                : questionOrder,
            question: q.question,
            answer: answers,
            correctAnswer: this._resolveCorrectAnswer(q.correctAnswer, answers),
            lessonId: newLesson._id,
          }).save();
        }

        existingTitles.add(title);
        created += 1;
      }

      if (created === 0) {
        res.send(
          `<center><h2 style="color: red">Không import được chương nào (${skipped} chương đã tồn tại hoặc thiếu title)</h2></center>`,
        );
        return;
      }

      res.redirect(
        `/lesson.html?imported=${created}&skipped=${skipped}`,
      );
    } catch (e) {
      res.json({
        success: false,
        message: 'Create failed. Please try again.',
        error: e.message,
      });
    }
  }


    //detete lesson:
    deleteLesson(req, res, next) {
        if (req.body.id == null) {
            res.json({ message: 'Cần truyền params id', status: false })
            return
        }
        Lesson.deleteOne({ _id: req.body.id }, function (err) {
            if (err) {
                res.json({ message: 'Delete failed', status: false })
                return
            }
            Topic.deleteMany({ lessonId: req.body.id }, function (err) {
                if (err) {
                    res.json({ message: 'Delete failed', status: false })
                    return
                }
            })
            Quiz.findOne({ lessonId: req.body.id }).then(quiz => {
                Quiz.deleteOne({ lessonId: req.body.id }, function (err) {
                    if (err) {
                        res.json({ message: 'Delete failed', status: false })
                        return
                    }
                })
                Question.deleteMany({ quizId: quiz._id }, function (err) {
                    if (err) {
                        res.json({ message: 'Delete failed', status: false })
                        return
                    }
                })
            })

            res.redirect('/lesson.html')
        })
    }

    getAllTopicWithNoFomart(req, res) {
        Topic.find({}).then(topics => {
            res.json({
                isSuccess: true,
                code: 200,
                message: "success",
                data: topics
            })
        }).catch(e => {
            res.json({
                status: false,
                message: e.message,
                code: 404
            })
        })
    }

    async getAllTopic(req, res) {
        try {
            var lessons = await Lesson.find({})
            var listData = []
            for (var i of lessons) {
                const topic = await Topic.find({ lessonId: i._id })
                console.log(topic)
                listData.push({
                    lessonID: i._id,
                    title: i.title,
                    topics: topic
                })
            }
            res.json({
                isSuccess: true,
                code: 200,
                message: "success",
                data: listData
            })
        } catch (e) {
            res.json({
                status: false,
                message: e.message,
                code: 404
            })
        }

    }
    async getAllQuiz(req, res) {
        try {
            const quiz = await Quiz.find()
            var listData = []
            for (var i of quiz) {
                const question = await Question.find({ quizId: i._id }).sort({ STT: 1 })
                listData.push({
                    _id: i._id,
                    lessonId: i.lessonId,
                    name: i.name,
                    question: question
                })
            }
            res.json({
                isSuccess: true,
                code: 200,
                message: "success",
                data: listData
            })
        } catch (e) {
            res.json({
                status: false,
                message: e.message,
                code: 404
            })
        }

    }

    async thongKeUser(req, res) {
        try {
            var data = new Map();
            var process = await Process.find({})
            for (var i of process) {
                if (!data.has(i.lessonId)) {
                    data.set(i.lessonId, 1)
                } else {
                    var count = Number(data.get(i.lessonId)) + 1
                    data.set(i.lessonId, count)
                }
            }

            var listId = []
            data.forEach((value, key) => {
                listId.push(key)
            })

            var listReturn = []
            for (var j of listId) {
                try {
                    var lesson = await Lesson.findOne({ _id: j })
                    if (lesson != null) {
                        listReturn.push({
                            _id: j,
                            title: lesson.title,
                            totalTopic: lesson.totalTopic,
                            activeCount: data.get(j),
                        })
                    }
                } catch (e) {
                    res.json({
                        status: false,
                        message: e.message,
                        code: 404
                    })
                }

            }
            res.json({
                isSuccess: true,
                code: 200,
                message: "success",
                data: listReturn
            })
        } catch (e) {
            res.json({
                status: false,
                message: e.message,
                code: 404
            })
        }
    }

}


class LessonMD {
    title
    topic
    _id
    constructor(title, totalTopic, _id) {
        this.title = title,
            this.totalTopic = totalTopic,
            this._id = _id
    }
}

module.exports = new LessonController()