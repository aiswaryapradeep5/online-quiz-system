const r = require('express').Router();
const c = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const s = require('../validators/schemas');

r.post('/register', validate(s.register), c.register);
r.post('/login', validate(s.login), c.login);
r.get('/me', requireAuth, c.me);

module.exports = r;
