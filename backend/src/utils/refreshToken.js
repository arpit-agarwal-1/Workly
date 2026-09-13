const crypto = require('crypto');

function generateRefreshTokenFamilyId() {
  return crypto.randomUUID();
}

function generateRefreshToken() {
  const token = crypto.randomBytes(32).toString('hex');

  if (!token || typeof token !== 'string' || token.length < 32) {
    throw new Error('Failed to generate a secure refresh token.');
  }

  return token;
}

function hashRefreshToken(token) {
  if (typeof token !== 'string') {
    throw new TypeError('Refresh token must be a string.');
  }

  if (token.length === 0) {
    throw new Error('Refresh token must not be empty.');
  }

  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  generateRefreshToken,
  generateRefreshTokenFamilyId,
  hashRefreshToken,
};
