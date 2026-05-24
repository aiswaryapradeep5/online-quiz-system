const Joi = require('joi');

exports.register = Joi.object({
  email: Joi.string().email().max(190).required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().trim().min(1).max(120).required(),
});

exports.login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

exports.quiz = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().allow('').max(2000),
  durationSeconds: Joi.number().integer().min(30).max(86400).required(),
  isPublished: Joi.boolean().default(false),
});

exports.question = Joi.object({
  quizId: Joi.number().integer().required(),
  text: Joi.string().trim().min(1).max(2000).required(),
  points: Joi.number().integer().min(1).max(100).default(1),
  position: Joi.number().integer().min(0).default(0),
  options: Joi.array().min(2).max(8).items(
    Joi.object({
      text: Joi.string().trim().min(1).max(500).required(),
      isCorrect: Joi.boolean().default(false),
    })
  ).custom((arr, helpers) => {
    if (!arr.some((o) => o.isCorrect))
      return helpers.error('any.invalid', { message: 'At least one option must be correct' });
    return arr;
  }).required(),
});

exports.startAttempt = Joi.object({
  quizId: Joi.number().integer().required(),
});

exports.submitAttempt = Joi.object({
  answers: Joi.array().items(
    Joi.object({
      questionId: Joi.number().integer().required(),
      optionId: Joi.number().integer().required(),
    })
  ).required(),
});
