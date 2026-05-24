const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const offset = (page - 1) * limit;
  const search = `%${(req.query.search || '').trim()}%`;

  const [items] = await db.query(
    `SELECT q.id, q.title, q.description, q.duration_seconds, q.created_at,
            u.name AS author,
            (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) AS question_count
     FROM quizzes q
     JOIN users u ON u.id = q.created_by
     WHERE q.is_published = 1 AND q.title LIKE ?
     ORDER BY q.created_at DESC
     LIMIT ? OFFSET ?`,
    [search, limit, offset]
  );
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM quizzes WHERE is_published=1 AND title LIKE ?',
    [search]
  );
  res.json({ items, page, limit, total });
});

// Returns questions+options WITHOUT is_correct (answer secrecy)
exports.play = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [[quiz]] = await db.query(
    'SELECT id, title, description, duration_seconds FROM quizzes WHERE id=? AND is_published=1',
    [id]
  );
  if (!quiz) throw new ApiError(404, 'Quiz not found');
  const [questions] = await db.query(
    `SELECT id, text, points, position FROM questions
     WHERE quiz_id=? ORDER BY position, id`,
    [id]
  );
  const qIds = questions.map((q) => q.id);
  let options = [];
  if (qIds.length) {
    const [rows] = await db.query(
      'SELECT id, question_id, text FROM options WHERE question_id IN (?) ORDER BY id',
      [qIds]
    );
    options = rows;
  }
  const byQ = new Map(questions.map((q) => [q.id, { ...q, options: [] }]));
  for (const o of options) byQ.get(o.question_id).options.push(o);
  res.json({ quiz, questions: Array.from(byQ.values()) });
});
