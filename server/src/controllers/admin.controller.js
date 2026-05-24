const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// ---- Quizzes ----
exports.createQuiz = asyncHandler(async (req, res) => {
  const { title, description, durationSeconds, isPublished } = req.body;
  const [r] = await db.query(
    `INSERT INTO quizzes (title, description, duration_seconds, is_published, created_by)
     VALUES (?,?,?,?,?)`,
    [title, description || null, durationSeconds, isPublished ? 1 : 0, req.user.id]
  );
  res.status(201).json({ id: r.insertId });
});

exports.updateQuiz = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { title, description, durationSeconds, isPublished } = req.body;
  const [r] = await db.query(
    `UPDATE quizzes SET title=?, description=?, duration_seconds=?, is_published=? WHERE id=?`,
    [title, description || null, durationSeconds, isPublished ? 1 : 0, id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Quiz not found');
  res.json({ ok: true });
});

exports.deleteQuiz = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [r] = await db.query('DELETE FROM quizzes WHERE id=?', [id]);
  if (!r.affectedRows) throw new ApiError(404, 'Quiz not found');
  res.json({ ok: true });
});

exports.listQuizzesAll = asyncHandler(async (_req, res) => {
  const [rows] = await db.query(
    `SELECT q.id, q.title, q.is_published, q.duration_seconds, q.created_at,
            (SELECT COUNT(*) FROM questions WHERE quiz_id=q.id) AS question_count
     FROM quizzes q ORDER BY q.created_at DESC`
  );
  res.json({ items: rows });
});

// Full view including correct answers (admin only)
exports.quizFull = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [[quiz]] = await db.query('SELECT * FROM quizzes WHERE id=?', [id]);
  if (!quiz) throw new ApiError(404, 'Quiz not found');
  const [questions] = await db.query(
    'SELECT * FROM questions WHERE quiz_id=? ORDER BY position, id', [id]
  );
  const qIds = questions.map((q) => q.id);
  let options = [];
  if (qIds.length) {
    const [rows] = await db.query(
      'SELECT * FROM options WHERE question_id IN (?) ORDER BY id', [qIds]
    );
    options = rows;
  }
  const byQ = new Map(questions.map((q) => [q.id, { ...q, options: [] }]));
  for (const o of options) byQ.get(o.question_id).options.push(o);
  res.json({ quiz, questions: Array.from(byQ.values()) });
});

// ---- Questions (with nested options) ----
exports.createQuestion = asyncHandler(async (req, res) => {
  const { quizId, text, points, position, options } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[q]] = await conn.query('SELECT id FROM quizzes WHERE id=?', [quizId]);
    if (!q) throw new ApiError(404, 'Quiz not found');
    const [r] = await conn.query(
      'INSERT INTO questions (quiz_id, text, points, position) VALUES (?,?,?,?)',
      [quizId, text, points, position]
    );
    for (const o of options) {
      await conn.query(
        'INSERT INTO options (question_id, text, is_correct) VALUES (?,?,?)',
        [r.insertId, o.text, o.isCorrect ? 1 : 0]
      );
    }
    await conn.commit();
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    await conn.rollback(); throw e;
  } finally { conn.release(); }
});

exports.updateQuestion = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { text, points, position, options } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      'UPDATE questions SET text=?, points=?, position=? WHERE id=?',
      [text, points, position, id]
    );
    if (!r.affectedRows) throw new ApiError(404, 'Question not found');
    await conn.query('DELETE FROM options WHERE question_id=?', [id]);
    for (const o of options) {
      await conn.query(
        'INSERT INTO options (question_id, text, is_correct) VALUES (?,?,?)',
        [id, o.text, o.isCorrect ? 1 : 0]
      );
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback(); throw e;
  } finally { conn.release(); }
});

exports.deleteQuestion = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [r] = await db.query('DELETE FROM questions WHERE id=?', [id]);
  if (!r.affectedRows) throw new ApiError(404, 'Question not found');
  res.json({ ok: true });
});
