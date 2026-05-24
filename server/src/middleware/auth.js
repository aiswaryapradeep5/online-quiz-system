const { verify } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

exports.requireAuth = (req, _res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return next(new ApiError(401, 'Missing token'));
  try {
    req.user = verify(token); // { id, role, email }
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired token'));
  }
};

exports.requireRole = (role) => (req, _res, next) => {
  if (!req.user || req.user.role !== role)
    return next(new ApiError(403, 'Forbidden'));
  next();
};
