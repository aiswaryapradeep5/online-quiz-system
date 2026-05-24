const r = require('express').Router();
const c = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validators/schemas');

r.use(requireAuth, requireRole('admin'));

r.get('/quizzes', c.listQuizzesAll);
r.get('/quizzes/:id/full', c.quizFull);
r.post('/quizzes', validate(s.quiz), c.createQuiz);
r.put('/quizzes/:id', validate(s.quiz), c.updateQuiz);
r.delete('/quizzes/:id', c.deleteQuiz);

r.post('/questions', validate(s.question), c.createQuestion);
r.put('/questions/:id', validate(s.question), c.updateQuestion);
r.delete('/questions/:id', c.deleteQuestion);
module.exports = r;
