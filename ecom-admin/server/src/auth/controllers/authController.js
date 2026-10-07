const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../utils/errors');

const handleValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400, 'VALIDATION_ERROR');
  }
};

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    next(err);
  }
};

exports.login = asyncHandler(async (req, res) => {
  handleValidation(req);
  const data = await authService.login(req, res);
  sendSuccess(res, 200, data);
});

exports.refresh = asyncHandler(async (req, res) => {
  const data = await authService.refresh(req, res);
  sendSuccess(res, 200, data);
});

exports.logout = asyncHandler(async (req, res) => {
  await authService.logout(req, res);
  sendSuccess(res, 200, { message: 'Logged out successfully' });
});

exports.logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req, res);
  sendSuccess(res, 200, { message: 'All sessions revoked' });
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req);
  sendSuccess(res, 200, { user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req);
  sendSuccess(res, 200, result);
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  handleValidation(req);
  const result = await authService.forgotPassword(req);
  sendSuccess(res, 200, result);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  handleValidation(req);
  const result = await authService.resetPassword(req);
  sendSuccess(res, 200, result);
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  handleValidation(req);
  const result = await authService.verifyEmail(req);
  sendSuccess(res, 200, result);
});

exports.getSessions = asyncHandler(async (req, res) => {
  const sessions = await authService.listSessions(req);
  sendSuccess(res, 200, { sessions });
});

exports.revokeSession = asyncHandler(async (req, res) => {
  const result = await authService.revokeUserSession(req);
  sendSuccess(res, 200, result);
});

exports.revokeAllSessions = asyncHandler(async (req, res) => {
  const result = await authService.revokeAllSessions(req);
  sendSuccess(res, 200, result);
});

exports.createInvitation = asyncHandler(async (req, res) => {
  handleValidation(req);
  const result = await authService.createInvitation(req);
  sendSuccess(res, 201, result);
});

exports.acceptInvitation = asyncHandler(async (req, res) => {
  handleValidation(req);
  const data = await authService.acceptInvitation(req, res);
  sendSuccess(res, 201, data);
});
