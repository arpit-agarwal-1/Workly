const { test } = require('node:test');
const assert = require('node:assert/strict');

const { generateRefreshToken, hashRefreshToken } = require('../src/utils/refreshToken');

test('generated refresh tokens are strings', () => {
  const token = generateRefreshToken();

  assert.equal(typeof token, 'string');
  assert.ok(token.length > 0);
});

test('tokens have sufficient length and entropy', () => {
  const token = generateRefreshToken();

  assert.ok(token.length >= 32);
  assert.match(token, /^[a-f0-9]+$/i);
});

test('two generated tokens are different', () => {
  const first = generateRefreshToken();
  const second = generateRefreshToken();

  assert.notEqual(first, second);
});

test('tokens are not predictable', () => {
  const tokens = Array.from({ length: 20 }, () => generateRefreshToken());
  const uniqueTokens = new Set(tokens);

  assert.equal(uniqueTokens.size, tokens.length);
});

test('hashing the same token produces the same hash', () => {
  const token = generateRefreshToken();

  assert.equal(hashRefreshToken(token), hashRefreshToken(token));
});

test('different tokens produce different hashes', () => {
  const firstToken = generateRefreshToken();
  const secondToken = generateRefreshToken();

  assert.notEqual(hashRefreshToken(firstToken), hashRefreshToken(secondToken));
});

test('plaintext token is not equal to its hash', () => {
  const token = generateRefreshToken();
  const hash = hashRefreshToken(token);

  assert.notEqual(token, hash);
});

test('invalid input is rejected', () => {
  assert.throws(() => hashRefreshToken(null), /Refresh token must be a string/i);
  assert.throws(() => hashRefreshToken(undefined), /Refresh token must be a string/i);
  assert.throws(() => hashRefreshToken(''), /Refresh token must not be empty/i);
});

test('token generation does not log secrets', () => {
  const originalLog = console.log;
  let loggedValue = null;
  console.log = (...args) => {
    loggedValue = args.join(' ');
  };

  try {
    const token = generateRefreshToken();
    assert.equal(typeof token, 'string');
    assert.ok(!loggedValue || !loggedValue.includes(token));
  } finally {
    console.log = originalLog;
  }
});

test('generated tokens contain no JWT structure or claims', () => {
  const token = generateRefreshToken();

  assert.doesNotMatch(token, /^eyJ/);
  assert.equal(token.includes('.'), false);
});

test('hashing does not mutate input', () => {
  const token = generateRefreshToken();
  const original = token;

  hashRefreshToken(token);

  assert.equal(token, original);
});
