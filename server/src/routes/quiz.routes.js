const r = require('express').Router();
const c = require('../controllers/quiz.controller');
r.get('/', c.list);
r.get('/:id/play', c.play);
module.exports = r;
