const env = require('../../config/env');
const logger = require('../utils/logger');

const sendEmail = async ({ to, subject, html, text, actionUrl }) => {
  if (!env.email.providerApiKey) {
    logger.info('Email stub (no provider configured)', {
      to,
      subject,
      actionUrl: actionUrl || text?.slice(0, 300),
    });
    if (!env.isProduction && actionUrl) {
      console.log(`\n[auth-email] ${subject}\n  To: ${to}\n  Link: ${actionUrl}\n`);
    }
    return { delivered: false, stub: true };
  }

  logger.warn('EMAIL_PROVIDER_API_KEY set but no provider adapter configured', { to, subject });
  return { delivered: false, stub: true };
};

const sendPasswordResetEmail = async ({ to, resetUrl }) =>
  sendEmail({
    to,
    subject: 'Reset your admin password',
    actionUrl: resetUrl,
    text: `Reset your password using this link (expires in 1 hour): ${resetUrl}`,
    html: `<p>Reset your password using this link (expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

const sendInvitationEmail = async ({ to, inviteUrl, role }) =>
  sendEmail({
    to,
    subject: 'You have been invited to the admin panel',
    actionUrl: inviteUrl,
    text: `You have been invited as ${role}. Accept the invitation: ${inviteUrl}`,
    html: `<p>You have been invited as <strong>${role}</strong>.</p><p><a href="${inviteUrl}">Accept invitation</a></p>`,
  });

const sendVerificationEmail = async ({ to, verifyUrl }) =>
  sendEmail({
    to,
    subject: 'Verify your email address',
    actionUrl: verifyUrl,
    text: `Verify your email: ${verifyUrl}`,
    html: `<p><a href="${verifyUrl}">Verify your email</a></p>`,
  });

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendInvitationEmail,
  sendVerificationEmail,
};
