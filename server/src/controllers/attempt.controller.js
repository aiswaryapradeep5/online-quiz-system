const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.start = asyncHandler(async (req, res) => {
  const { quizId } = req.body;
  const [[quiz]] = await db.query(
    'SELECT id, title, duration_seconds FROM quizzes WHERE id=? AND is_published=1',
    [quizId]
  );
  if (!quiz) throw new ApiError(404, 'Quiz not available');

  // Server-controlled timing
  const startedAt = new Date();
  const expiresAt = new Date(
  Date.now() + quiz.duration_seconds * 1000
);

  const [[totals]] = await db.query(
    'SELECT COALESCE(SUM(points),0) AS total_points FROM questions WHERE quiz_id=?',
    [quizId]
  );

  const [r] = await db.query(
    `INSERT INTO attempts (user_id, quiz_id, started_at, expires_at, total_points, status)
     VALUES (?,?,?,?,?,'in_progress')`,
    [req.user.id, quizId, startedAt, expiresAt, totals.total_points]
  );

  // Return questions WITHOUT correct flags
  const [questions] = await db.query(
    'SELECT id, text, points, position FROM questions WHERE quiz_id=? ORDER BY position, id',
    [quizId]
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

  res.status(201).json({
    attemptId: r.insertId,
    quiz: { id: quiz.id, title: quiz.title },
    startedAt,
    expiresAt,
    durationSeconds: quiz.duration_seconds,
    questions: Array.from(byQ.values()),
  });
});

exports.submit = asyncHandler(async (req, res) => {
  const attemptId = Number(req.params.id);
  const { answers } = req.body;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[att]] = await conn.query(
      'SELECT id, user_id, quiz_id, expires_at, status, total_points FROM attempts WHERE id=? FOR UPDATE',
      [attemptId]
    );
    if (!att) throw new ApiError(404, 'Attempt not found');
    if (att.user_id !== req.user.id) throw new ApiError(403, 'Not your attempt');
    if (att.status !== 'in_progress') throw new ApiError(409, 'Attempt already finalized');

    const now = new Date();
    const expired = new Date(att.expires_at) < now;

    // Validate answers belong to this quiz
    if (answers.length) {
      const qIds = [...new Set(answers.map((a) => a.questionId))];
      const oIds = [...new Set(answers.map((a) => a.optionId))];
      const [validQ] = await conn.query(
        'SELECT id FROM questions WHERE quiz_id=? AND id IN (?)',
        [att.quiz_id, qIds]
      );
      if (validQ.length !== qIds.length)
        throw new ApiError(400, 'Answer references unknown question');
      const [validO] = await conn.query(
        `SELECT o.id FROM options o
         JOIN questions q ON q.id=o.question_id
         WHERE q.quiz_id=? AND o.id IN (?)`,
        [att.quiz_id, oIds]
      );
      if (validO.length !== oIds.length)
        throw new ApiError(400, 'Answer references unknown option');

      // Upsert answers (only if not expired; expired attempts auto-score whatever was sent? -> reject)
      if (!expired) {
        for (const a of answers) {
          await conn.query(
            `INSERT INTO attempt_answers (attempt_id, question_id, option_id)
             VALUES (?,?,?)
             ON DUPLICATE KEY UPDATE option_id = VALUES(option_id)`,
            [attemptId, a.questionId, a.optionId]
          );
        }
      }
    }

    // Score using SQL join — single pass
    const [[scoreRow]] = await conn.query(
      `SELECT COALESCE(SUM(q.points),0) AS score
       FROM attempt_answers aa
       JOIN options   o ON o.id = aa.option_id AND o.is_correct = 1
       JOIN questions q ON q.id = aa.question_id
       WHERE aa.attempt_id = ?`,
      [attemptId]
    );

    const finalStatus = expired ? 'expired' : 'submitted';
    await conn.query(
      `UPDATE attempts SET score=?, submitted_at=?, status=? WHERE id=?`,
      [scoreRow.score, now, finalStatus, attemptId]
    );

    // Build per-question review (now includes correct answers)
    const [details] = await conn.query(
      `SELECT q.id AS question_id, q.text AS question, q.points,
              aa.option_id AS selected_option_id,
              (SELECT id FROM options WHERE question_id=q.id AND is_correct=1 LIMIT 1) AS correct_option_id,
              CASE WHEN EXISTS (
                SELECT 1 FROM options o
                WHERE o.id = aa.option_id AND o.is_correct = 1
              ) THEN 1 ELSE 0 END AS is_correct
       FROM questions q
       LEFT JOIN attempt_answers aa ON aa.question_id=q.id AND aa.attempt_id=?
       WHERE q.quiz_id=?
       ORDER BY q.position, q.id`,
      [attemptId, att.quiz_id]
    );

    await conn.commit();
    res.json({
      attemptId,
      status: finalStatus,
      expired,
      score: scoreRow.score,
      total: att.total_points,
      details,
    });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

exports.myAttempts = asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT a.id, a.quiz_id, q.title AS quiz_title, a.started_at, a.submitted_at,
            a.score, a.total_points, a.status
     FROM attempts a
     JOIN quizzes q ON q.id = a.quiz_id
     WHERE a.user_id=?
     ORDER BY a.started_at DESC`,
    [req.user.id]
  );
  res.json({ items: rows });
});

exports.leaderboard = asyncHandler(async (req, res) => {

  const quizId = Number(req.params.quizId);

  const [rows] = await db.query(
    `
    SELECT
      u.name,
      a.score,
      a.total_points,
      ROUND((a.score / a.total_points) * 100, 1) AS percentage
    FROM attempts a
    JOIN users u ON a.user_id = u.id
    WHERE a.quiz_id = ?
      AND a.status = 'submitted'
    ORDER BY percentage DESC, a.score DESC
    LIMIT 10
    `,
    [quizId]
  );

  res.json(rows);
});