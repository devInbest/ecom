const express = require('express');
const { body, param } = require('express-validator');
const authController = require('../controllers/authController');
const legacyController = require('../../controllers/authController');
const { authenticate } = require('../middleware/authenticate');
const { authorize, authorizeRoles } = require('../middleware/authorize');
const { PERMISSIONS } = require('../../config/permissions');
const {
  loginIpLimiter,
  loginAccountLimiter,
  authRefreshLimiter,
  passwordResetLimiter,
} = require('../middleware/rateLimiter');
const { validatePassword, PASSWORD_POLICY } = require('../services/passwordService');
const { INVITABLE_ROLES } = require('../../config/permissions');

const router = express.Router();

// ─── Public auth ───────────────────────────────────────────────────────────
router.post(
  '/login',
  loginIpLimiter,
  loginAccountLimiter,
  [
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  authController.login
);

router.post('/refresh', authRefreshLimiter, authController.refresh);

router.post(
  '/forgot-password',
  passwordResetLimiter,
  [body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail()],
  authController.forgotPassword
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword').custom((value) => {
      const err = validatePassword(value);
      if (err) throw new Error(err);
      return true;
    }),
  ],
  authController.resetPassword
);

router.post(
  '/verify-email',
  [body('token').notEmpty().withMessage('Verification token is required')],
  authController.verifyEmail
);

router.post(
  '/admin/invitations/accept',
  [
    body('token').notEmpty().withMessage('Invitation token is required'),
    body('password').custom((value) => {
      const err = validatePassword(value);
      if (err) throw new Error(err);
      return true;
    }),
    body('name').optional().trim(),
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
  ],
  authController.acceptInvitation
);

// ─── Authenticated auth ────────────────────────────────────────────────────
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.getMe);
router.get('/sessions', authenticate, authController.getSessions);
router.delete('/sessions', authenticate, authController.revokeAllSessions);
router.delete('/sessions/:id', authenticate, [param('id').isMongoId()], authController.revokeSession);

router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').custom((value) => {
      const err = validatePassword(value);
      if (err) throw new Error(err);
      return true;
    }),
  ],
  authController.changePassword
);

router.post(
  '/admin/invitations',
  authenticate,
  authorize(PERMISSIONS.ADMIN_CREATE),
  [
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('role').optional().isIn(INVITABLE_ROLES).withMessage('Invalid role'),
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
  ],
  authController.createInvitation
);

// ─── Legacy profile / user management (migrated middleware) ────────────────
router.get('/me/avatar', authenticate, legacyController.getMyAvatar);
router.put('/profile', authenticate, legacyController.updateProfile);

router.get(
  '/users',
  authenticate,
  authorize(PERMISSIONS.ADMIN_READ),
  legacyController.getUsers
);

router.put(
  '/users/:id',
  authenticate,
  authorize(PERMISSIONS.ADMIN_UPDATE),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('isActive').isBoolean().withMessage('Status must be active or inactive'),
  ],
  legacyController.updateUser
);

router.patch(
  '/users/:id/password',
  authenticate,
  authorizeRoles('SUPERADMIN'),
  [
    body('newPassword')
      .matches(PASSWORD_POLICY)
      .withMessage(
        'Password must be at least 12 characters and include uppercase, lowercase, number, and special character'
      ),
  ],
  legacyController.resetUserPassword
);

router.delete(
  '/users/:id',
  authenticate,
  authorize(PERMISSIONS.ADMIN_DISABLE),
  legacyController.deleteUser
);

/** @deprecated Use POST /admin/invitations — kept for backward compatibility */
router.post(
  '/register',
  authenticate,
  authorize(PERMISSIONS.ADMIN_CREATE),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').custom((value) => {
      const err = validatePassword(value);
      if (err) throw new Error(err);
      return true;
    }),
    body('role').optional().isIn(INVITABLE_ROLES).withMessage('Invalid role'),
  ],
  legacyController.register
);

module.exports = router;
