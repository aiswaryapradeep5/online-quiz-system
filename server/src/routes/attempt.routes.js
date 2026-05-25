const r = require('express').Router();
const c = require('../controllers/attempt.controller');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validators/schemas');

r.get('/leaderboard/:quizId', c.leaderboard);

r.use(requireAuth);

r.post('/api/start', validate(s.startAttempt), c.start);
r.post('/:id/submit', validate(s.submitAttempt), c.submit);
r.get('/me', c.myAttempts);
module.exports = r;
