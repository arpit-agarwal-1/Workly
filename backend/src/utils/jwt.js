const jwt = require('jsonwebtoken');
const { jwtConfig, JWT_ALGORITHM, ACCESS_TOKEN_TTL_SECONDS } = require('../config/jwt');

class JwtTokenError extends Error {
  constructor(message = 'Invalid or expired access token.') {
    super(message);
    this.name = 'JwtTokenError';
  }
}

function validateRequiredString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${fieldName} is required.`);
  }
}

function validateClaims(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new JwtTokenError('Invalid access token payload.');
  }

  const allowedKeys = new Set(['sub', 'sid', 'iat', 'exp']);
  const unexpectedKeys = Object.keys(payload).filter((key) => !allowedKeys.has(key));

  if (unexpectedKeys.length > 0) {
    throw new JwtTokenError('Invalid access token payload.');
  }

  if (typeof payload.sub !== 'string' || payload.sub.trim().length === 0) {
    throw new JwtTokenError('Invalid access token payload.');
  }

  if (typeof payload.sid !== 'string' || payload.sid.trim().length === 0) {
    throw new JwtTokenError('Invalid access token payload.');
  }

  if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') {
    throw new JwtTokenError('Invalid access token payload.');
  }
}

function signAccessToken({ userId, sessionId }) {
  validateRequiredString(userId, 'userId');
  validateRequiredString(sessionId, 'sessionId');

  const payload = {
    sub: userId,
    sid: sessionId,
  };

  try {
    return jwt.sign(payload, jwtConfig.secret, {
      algorithm: JWT_ALGORITHM,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
  } catch (error) {
    throw new JwtTokenError('Unable to create access token.');
  }
}

function verifyAccessToken(token) {
  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new JwtTokenError('Access token is required.');
  }

  try {
    const payload = jwt.verify(token, jwtConfig.secret, {
      algorithms: [JWT_ALGORITHM],
    });

    validateClaims(payload);
    return payload;
  } catch (error) {
    if (error instanceof JwtTokenError) {
      throw error;
    }

    throw new JwtTokenError('Invalid or expired access token.');
  }
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  JwtTokenError,
};
