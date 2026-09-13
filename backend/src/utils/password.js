const argon2 = require('argon2');

const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 64 * 1024,
  timeCost: 3,
  parallelism: 1,
};

function validatePasswordInput(password, label = 'Password') {
  if (typeof password !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  if (password.length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
}

function validatePasswordHash(passwordHash) {
  if (typeof passwordHash !== 'string') {
    throw new TypeError('Password hash must be a non-empty string.');
  }

  if (passwordHash.length === 0) {
    throw new Error('Password hash must be a non-empty string.');
  }
}

async function hashPassword(password) {
  validatePasswordInput(password, 'Password');

  try {
    return await argon2.hash(password, ARGON2_CONFIG);
  } catch (error) {
    const message = error && error.message ? error.message : 'Password hashing failed.';
    throw new Error(`Password hashing failed: ${message}`);
  }
}

async function verifyPassword(password, passwordHash) {
  validatePasswordInput(password, 'Password');
  validatePasswordHash(passwordHash);

  try {
    return await argon2.verify(passwordHash, password);
  } catch (error) {
    return false;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
};
