const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { sign } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  const [exists] = await db.query(
    'SELECT id FROM users WHERE email=?',
    [email]
  );

  if (exists.length)
    throw new ApiError(409, 'Email already in use');

  const hash = await bcrypt.hash(password, 10);

  const [r] = await db.query(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?,?,?,?)',
    [email, hash, name, 'user']
  );

  const user = {
    id: r.insertId,
    email,
    name,
    role: 'user'
  };

  res.status(201).json({
    token: sign(user),
    user
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await db.query(
    'SELECT id, email, name, role, password_hash FROM users WHERE email=?',
    [email]
  );

  const u = rows[0];

  if (!u)
    throw new ApiError(401, 'Invalid credentials');

  const ok = await bcrypt.compare(password, u.password_hash);

  if (!ok)
    throw new ApiError(401, 'Invalid credentials');

  const user = {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role
  };

  res.json({
    token: sign(user),
    user
  });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});