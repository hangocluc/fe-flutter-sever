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

  _normalizeImportText(value) {
    if (value == null) {
      return '';
    }
    return String(value).trim();
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
      const existingByTitle = new Map(
        existingLessons.map((l) => [String(l.title).trim(), l]),
      );

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let topicsAdded = 0;
      let questionsAdded = 0;

      for (let lessonIndex = 0; lessonIndex < lessonRows.length; lessonIndex++) {
        const row = lessonRows[lessonIndex];
        const title = row.title != null ? String(row.title).trim() : '';
        if (!title) {
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

        const questionsForLesson = questionRows.filter((q) => {
          if (multiLesson && hasLessonKeyOnQuestions) {
            return this._rowBelongsToLesson(q, row, lessonIndex);
          }
          if (!multiLesson) {
            return true;
          }
          return false;
        });

        if (topicsForLesson.length === 0 && questionsForLesson.length === 0) {
          skipped += 1;
          continue;
        }

        let lesson = existingByTitle.get(title);
        const isNewLesson = !lesson;
        let quiz = null;

        const quizName =
          row.quizName != null && String(row.quizName).trim() !== ''
            ? String(row.quizName).trim()
            : `Quiz ${title}`;

        const existingTopicTitles = new Set();
        const existingQuestionTexts = new Set();
        const existingQuestionStts = new Set();
        let questionOrder = 0;

        if (lesson) {
          const existingTopics = await Topic.find(
            { lessonId: lesson._id },
            { title: 1 },
          );
          for (const t of existingTopics) {
            existingTopicTitles.add(this._normalizeImportText(t.title));
          }

          quiz = await Quiz.findOne({ lessonId: lesson._id });
          if (quiz) {
            const existingQuestions = await Question.find(
              { quizId: String(quiz._id) },
              { question: 1, STT: 1 },
            );
            for (const q of existingQuestions) {
              existingQuestionTexts.add(this._normalizeImportText(q.question));
              if (q.STT != null && !Number.isNaN(Number(q.STT))) {
                existingQuestionStts.add(Number(q.STT));
              }
            }
            questionOrder = existingQuestions.length;
          }
        }

        const ensureLessonAndQuiz = async () => {
          if (!lesson) {
            lesson = await Lesson({
              title,
              totalTopic: 0,
            }).save();
            existingByTitle.set(title, lesson);
          }
          if (!quiz) {
            quiz = await Quiz.findOne({ lessonId: lesson._id });
            if (!quiz) {
              quiz = await Quiz({
                lessonId: lesson._id,
                name: quizName,
              }).save();
            }
          }
        };

        let lessonTopicsAdded = 0;
        for (const t of topicsForLesson) {
          const topicTitle = this._normalizeImportText(t.title);
          if (!topicTitle || existingTopicTitles.has(topicTitle)) {
            continue;
          }
          await ensureLessonAndQuiz();
          await Topic({
            lessonId: lesson._id,
            title: t.title,
            content: t.content,
            videoLink: this._topicVideoLink(t),
          }).save();
          existingTopicTitles.add(topicTitle);
          lessonTopicsAdded += 1;
          topicsAdded += 1;
        }

        if (lesson && lessonTopicsAdded > 0) {
          const totalTopics = await Topic.countDocuments({ lessonId: lesson._id });
          await Lesson.updateOne(
            { _id: lesson._id },
            { totalTopic: totalTopics },
          );
        }

        let lessonQuestionsAdded = 0;
        for (const q of questionsForLesson) {
          const questionText = this._normalizeImportText(q.question);
          if (!questionText || existingQuestionTexts.has(questionText)) {
            continue;
          }

          const explicitStt =
            q.STT != null && String(q.STT).trim() !== ''
              ? Number(q.STT)
              : null;
          if (
            explicitStt != null &&
            !Number.isNaN(explicitStt) &&
            existingQuestionStts.has(explicitStt)
          ) {
            continue;
          }

          await ensureLessonAndQuiz();
          questionOrder += 1;
          const answers = this._buildAnswers(q);
          const stt =
            explicitStt != null && !Number.isNaN(explicitStt)
              ? explicitStt
              : questionOrder;

          await Question({
            quizId: quiz._id,
            STT: stt,
            question: q.question,
            answer: answers,
            correctAnswer: this._resolveCorrectAnswer(q.correctAnswer, answers),
            lessonId: lesson._id,
          }).save();

          existingQuestionTexts.add(questionText);
          if (explicitStt != null && !Number.isNaN(explicitStt)) {
            existingQuestionStts.add(explicitStt);
          }
          lessonQuestionsAdded += 1;
          questionsAdded += 1;
        }

        if (isNewLesson && (lessonTopicsAdded > 0 || lessonQuestionsAdded > 0)) {
          created += 1;
        } else if (!isNewLesson && (lessonTopicsAdded > 0 || lessonQuestionsAdded > 0)) {
          updated += 1;
        } else {
          skipped += 1;
        }
      }

      if (created === 0 && topicsAdded === 0 && questionsAdded === 0) {
        res.send(
          `<center><h2 style="color: red">Không import được dữ liệu nào (${skipped} chương thiếu title hoặc không có bài học/câu hỏi mới trong file)</h2></center>`,
        );
        return;
      }

      res.redirect(
        `/lesson.html?imported=${created}&updated=${updated}&topics=${topicsAdded}&questions=${questionsAdded}&skipped=${skipped}`,
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
        const lessonId = req.body.id
        Lesson.deleteOne({ _id: lessonId }, function (err) {
            if (err) {
                res.json({ message: 'Delete failed', status: false })
                return
            }
            Topic.deleteMany({ lessonId }, function (err) {
                if (err) {
                    res.json({ message: 'Delete failed', status: false })
                    return
                }
            })
            Quiz.findOne({ lessonId }).then((quiz) => {
                const questionFilter = quiz
                    ? {
                        $or: [
                            { lessonId },
                            { quizId: quiz._id },
                            { quizId: String(quiz._id) },
                        ],
                    }
                    : { lessonId }

                Question.deleteMany(questionFilter, function (err) {
                    if (err) {
                        res.json({ message: 'Delete failed', status: false })
                        return
                    }
                })
                Quiz.deleteOne({ lessonId }, function (err) {
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