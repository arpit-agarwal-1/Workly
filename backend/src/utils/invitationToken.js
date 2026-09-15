const crypto = require('crypto');
const { env } = require('../config/env');

const INVITATION_TOKEN_TTL_DAYS = 7;

function generateInvitationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashInvitationToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function getInvitationExpiresAt(now = new Date()) {
  return new Date(now.getTime() + INVITATION_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function buildInvitationLink(token, baseUrl = env.CLIENT_URL) {
  if (!token) {
    return null;
  }

  try {
    const normalizedBaseUrl = String(baseUrl || 'http://localhost:4200').replace(/\/+$/, '');
    const url = new URL('/accept-invitation', normalizedBaseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  } catch (error) {
    return `${String(baseUrl || 'http://localhost:4200').replace(/\/+$/, '')}/accept-invitation?token=${encodeURIComponent(token)}`;
  }
}

module.exports = {
  INVITATION_TOKEN_TTL_DAYS,
  generateInvitationToken,
  hashInvitationToken,
  getInvitationExpiresAt,
  buildInvitationLink,
};
