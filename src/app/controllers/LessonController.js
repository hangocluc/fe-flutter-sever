const path = require('path')
const Lesson = require('../model/LessonModel')
const xlsx = require('xlsx');
const Topic = require('../model/TopicModel')
const Quiz = require('../model/QuizModel')
const Question = require('../model/QuestionModel')
const Process = require('../model/ProcessModel')
const User = require('../model/UserModel');
const UserModel = require('../model/UserModel');
const { sortByTitleNumber } = require('../helpers/sortByTitleNumber');

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
        res.render('lesson', { lesson: sortByTitleNumber(a, (l) => l.title) });
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

      const hasLessonKeyOnTopics = topicRows.some((r) => this._topicLessonKey(r) != null);
      const hasLessonKeyOnQuestions = questionRows.some((r) => this._topicLessonKey(r) != null);
      const multiLesson = lessonRows.length > 1;

      // Khi có nhiều chương, mỗi dòng topic/question bắt buộc phải có cột tham chiếu
      // chương (lesson_id) để biết thuộc chương nào. Nếu thiếu, toàn bộ dòng sẽ bị bỏ
      // qua âm thầm -> báo lỗi rõ ràng để người dùng biết phải thêm cột lesson_id.
      if (multiLesson) {
        const missing = [];
        if (topicRows.length > 0 && !hasLessonKeyOnTopics) missing.push('Topics (bài học)');
        if (questionRows.length > 0 && !hasLessonKeyOnQuestions) missing.push('Questions (câu hỏi)');
        if (missing.length > 0) {
          res.send(
            `<center><h2 style="color: red">File có ${lessonRows.length} chương nhưng sheet ${missing.join(' và ')} thiếu cột <b>lesson_id</b>.<br/>` +
              `Hãy thêm cột <b>lesson_id</b> (giá trị khớp cột id ở sheet Lesson, vd 1, 2, 3...) cho từng dòng, giống như sheet Topics.</h2></center>`,
          );
          return;
        }
      }

      // Đếm các dòng "mồ côi": có nội dung nhưng lesson_id trống hoặc không khớp
      // chương nào trong file -> những dòng này sẽ bị bỏ qua, cần báo cho người dùng.
      let orphanTopics = 0;
      let orphanQuestions = 0;
      if (multiLesson) {
        const validLessonKeys = new Set();
        lessonRows.forEach((lr, i) => {
          validLessonKeys.add(this._lessonRowKey(lr, i));
          const t = lr.title != null ? String(lr.title).trim() : '';
          if (t) validLessonKeys.add(t);
        });
        const isOrphan = (row) => {
          const key = this._topicLessonKey(row);
          return key == null || !validLessonKeys.has(key);
        };
        orphanTopics = topicRows.filter(
          (t) => this._normalizeImportText(t.title) && isOrphan(t),
        ).length;
        orphanQuestions = questionRows.filter(
          (q) => this._normalizeImportText(q.question) && isOrphan(q),
        ).length;
      }

      // Pre-load tất cả lessons, topics, quizzes, questions một lần duy nhất
      const [existingLessons, existingTopics, existingQuizzes, existingQuestions] =
        await Promise.all([
          Lesson.find({}, { title: 1 }),
          Topic.find({}, { lessonId: 1, title: 1 }),
          Quiz.find({}, { lessonId: 1, name: 1 }),
          Question.find({}, { quizId: 1, question: 1, STT: 1, lessonId: 1 }),
        ]);

      const existingByTitle = new Map(existingLessons.map((l) => [String(l.title).trim(), l]));

      // Index topics/quiz/questions theo lessonId để tra cứu O(1)
      // topicsByLesson: Set tiêu đề (để lọc trùng khi thêm)
      // dbTopicDocsByLesson: danh sách {_id, title} (để biết cái nào cần xoá khi đồng bộ)
      const topicsByLesson = new Map();
      const dbTopicDocsByLesson = new Map();
      for (const t of existingTopics) {
        const key = String(t.lessonId);
        if (!topicsByLesson.has(key)) {
          topicsByLesson.set(key, new Set());
          dbTopicDocsByLesson.set(key, []);
        }
        const title = this._normalizeImportText(t.title);
        topicsByLesson.get(key).add(title);
        dbTopicDocsByLesson.get(key).push({ _id: t._id, title });
      }

      const quizByLesson = new Map(existingQuizzes.map((q) => [String(q.lessonId), q]));

      const questionsByQuiz = new Map();
      const questionSttsByQuiz = new Map();
      const questionCountByQuiz = new Map();
      const dbQuestionDocsByQuiz = new Map();
      for (const q of existingQuestions) {
        const key = String(q.quizId);
        if (!questionsByQuiz.has(key)) {
          questionsByQuiz.set(key, new Set());
          questionSttsByQuiz.set(key, new Set());
          questionCountByQuiz.set(key, 0);
          dbQuestionDocsByQuiz.set(key, []);
        }
        const text = this._normalizeImportText(q.question);
        questionsByQuiz.get(key).add(text);
        dbQuestionDocsByQuiz.get(key).push({ _id: q._id, text });
        if (q.STT != null && !Number.isNaN(Number(q.STT))) {
          questionSttsByQuiz.get(key).add(Number(q.STT));
        }
        questionCountByQuiz.set(key, questionCountByQuiz.get(key) + 1);
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let topicsAdded = 0;
      let questionsAdded = 0;
      let topicsDeleted = 0;
      let questionsDeleted = 0;

      for (let lessonIndex = 0; lessonIndex < lessonRows.length; lessonIndex++) {
        const row = lessonRows[lessonIndex];
        const title = row.title != null ? String(row.title).trim() : '';
        if (!title) { skipped += 1; continue; }

        const topicsForLesson = topicRows.filter((t) => {
          if (multiLesson && hasLessonKeyOnTopics) return this._rowBelongsToLesson(t, row, lessonIndex);
          if (!multiLesson) return true;
          return false;
        });

        const questionsForLesson = questionRows.filter((q) => {
          if (multiLesson && hasLessonKeyOnQuestions) return this._rowBelongsToLesson(q, row, lessonIndex);
          if (!multiLesson) return true;
          return false;
        });

        if (topicsForLesson.length === 0 && questionsForLesson.length === 0) {
          skipped += 1;
          continue;
        }

        let lesson = existingByTitle.get(title);
        const isNewLesson = !lesson;

        const quizName =
          row.quizName != null && String(row.quizName).trim() !== ''
            ? String(row.quizName).trim()
            : `Quiz ${title}`;

        // Chuẩn bị danh sách topics/questions cần insert (lọc trùng)
        const topicsToInsert = [];
        const existingTopicTitlesForLesson = lesson
          ? (topicsByLesson.get(String(lesson._id)) ?? new Set())
          : new Set();
        const localTopicTitles = new Set(existingTopicTitlesForLesson);

        for (const t of topicsForLesson) {
          const topicTitle = this._normalizeImportText(t.title);
          if (!topicTitle || localTopicTitles.has(topicTitle)) continue;
          topicsToInsert.push(t);
          localTopicTitles.add(topicTitle);
        }

        const quizKey = lesson ? String(quizByLesson.get(String(lesson._id))?._id ?? '') : '';
        const existingQTexts = quizKey ? (questionsByQuiz.get(quizKey) ?? new Set()) : new Set();
        const existingQStts = quizKey ? (questionSttsByQuiz.get(quizKey) ?? new Set()) : new Set();
        let questionOrder = quizKey ? (questionCountByQuiz.get(quizKey) ?? 0) : 0;

        const questionsToInsert = [];
        const localQTexts = new Set(existingQTexts);
        const localQStts = new Set(existingQStts);

        for (const q of questionsForLesson) {
          const questionText = this._normalizeImportText(q.question);
          if (!questionText || localQTexts.has(questionText)) continue;
          const explicitStt = q.STT != null && String(q.STT).trim() !== '' ? Number(q.STT) : null;
          if (explicitStt != null && !Number.isNaN(explicitStt) && localQStts.has(explicitStt)) continue;
          questionsToInsert.push({ row: q, explicitStt });
          localQTexts.add(questionText);
          if (explicitStt != null && !Number.isNaN(explicitStt)) localQStts.add(explicitStt);
        }

        // Đồng bộ 2 chiều: xoá topic/question có trong DB nhưng KHÔNG còn trong file.
        // Guardrail: chỉ xoá khi (1) chương đã tồn tại trong DB, và (2) file CÓ cung cấp
        // dữ liệu loại đó cho chương này -> tránh xoá nhầm khi sheet để trống.
        const topicIdsToDelete = [];
        if (!isNewLesson && topicsForLesson.length > 0) {
          const fileTopicTitles = new Set(
            topicsForLesson
              .map((t) => this._normalizeImportText(t.title))
              .filter((x) => x),
          );
          const dbTopicDocs = dbTopicDocsByLesson.get(String(lesson._id)) ?? [];
          for (const d of dbTopicDocs) {
            if (!fileTopicTitles.has(d.title)) topicIdsToDelete.push(d._id);
          }
        }

        const questionIdsToDelete = [];
        if (!isNewLesson && questionsForLesson.length > 0 && quizKey) {
          const fileQTexts = new Set(
            questionsForLesson
              .map((q) => this._normalizeImportText(q.question))
              .filter((x) => x),
          );
          const dbQuestionDocs = dbQuestionDocsByQuiz.get(quizKey) ?? [];
          for (const d of dbQuestionDocs) {
            if (!fileQTexts.has(d.text)) questionIdsToDelete.push(d._id);
          }
        }

        if (
          topicsToInsert.length === 0 &&
          questionsToInsert.length === 0 &&
          topicIdsToDelete.length === 0 &&
          questionIdsToDelete.length === 0
        ) {
          skipped += 1;
          continue;
        }

        // Tạo lesson + quiz nếu chưa có (chỉ 1 lần per lesson)
        if (!lesson) {
          lesson = await Lesson({ title, totalTopic: 0 }).save();
          existingByTitle.set(title, lesson);
        }

        let quiz = quizByLesson.get(String(lesson._id));
        if (!quiz) {
          quiz = await Quiz({ lessonId: lesson._id, name: quizName }).save();
          quizByLesson.set(String(lesson._id), quiz);
        }

        // Batch insert topics
        if (topicsToInsert.length > 0) {
          const topicDocs = topicsToInsert.map((t) => ({
            lessonId: lesson._id,
            title: t.title,
            content: t.content,
            videoLink: this._topicVideoLink(t),
          }));
          await Topic.insertMany(topicDocs, { ordered: false });
          topicsAdded += topicsToInsert.length;
        }

        // Xoá topic không còn trong file (đồng bộ)
        if (topicIdsToDelete.length > 0) {
          await Topic.deleteMany({ _id: { $in: topicIdsToDelete } });
          topicsDeleted += topicIdsToDelete.length;
        }

        // Cập nhật totalTopic theo cả thêm lẫn xoá (không cần countDocuments)
        const topicDelta = topicsToInsert.length - topicIdsToDelete.length;
        if (topicDelta !== 0) {
          const prevTotal = lesson.totalTopic ?? 0;
          await Lesson.updateOne(
            { _id: lesson._id },
            { totalTopic: Math.max(0, prevTotal + topicDelta) },
          );
        }

        // Batch insert questions
        if (questionsToInsert.length > 0) {
          const questionDocs = questionsToInsert.map(({ row: q, explicitStt }) => {
            questionOrder += 1;
            const answers = this._buildAnswers(q);
            const stt = explicitStt != null && !Number.isNaN(explicitStt) ? explicitStt : questionOrder;
            return {
              quizId: quiz._id,
              STT: stt,
              question: q.question,
              answer: answers,
              correctAnswer: this._resolveCorrectAnswer(q.correctAnswer, answers),
              lessonId: lesson._id,
            };
          });
          await Question.insertMany(questionDocs, { ordered: false });
          questionsAdded += questionsToInsert.length;
        }

        // Xoá question không còn trong file (đồng bộ)
        if (questionIdsToDelete.length > 0) {
          await Question.deleteMany({ _id: { $in: questionIdsToDelete } });
          questionsDeleted += questionIdsToDelete.length;
        }

        if (isNewLesson) {
          created += 1;
        } else {
          updated += 1;
        }
      }

      if (
        created === 0 &&
        topicsAdded === 0 &&
        questionsAdded === 0 &&
        topicsDeleted === 0 &&
        questionsDeleted === 0
      ) {
        const reasons = [];
        if (orphanQuestions > 0) {
          reasons.push(
            `${orphanQuestions} câu hỏi bị bỏ qua vì cột <b>lesson_id</b> trống hoặc không khớp chương nào trong sheet Lesson`,
          );
        }
        if (orphanTopics > 0) {
          reasons.push(
            `${orphanTopics} bài học bị bỏ qua vì cột <b>lesson_id</b> trống hoặc không khớp chương nào`,
          );
        }
        if (reasons.length === 0) {
          reasons.push(
            'tất cả bài học/câu hỏi trong file đã tồn tại trong hệ thống (không có dữ liệu mới)',
          );
        }
        res.send(
          `<center><h2 style="color: red">Không import được dữ liệu nào.<br/>${reasons.join('<br/>')}</h2></center>`,
        );
        return;
      }

      res.redirect(
        `/lesson.html?imported=${created}&updated=${updated}&topics=${topicsAdded}&questions=${questionsAdded}&topicsDeleted=${topicsDeleted}&questionsDeleted=${questionsDeleted}&skipped=${skipped}`,
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