const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { signAccessToken, verifyAccessToken } = require('../src/utils/jwt');
const { jwtConfig } = require('../src/config/jwt');

test('valid access token can be generated', () => {
  const token = signAccessToken({ userId: 'user_123', sessionId: 'session_123' });

  assert.equal(typeof token, 'string');
  assert.ok(token.length > 0);
});

test('generated token contains sub', () => {
  const token = signAccessToken({ userId: 'user_123', sessionId: 'session_123' });
  const payload = jwt.decode(token);

  assert.equal(payload.sub, 'user_123');
});

test('generated token contains sid', () => {
  const token = signAccessToken({ userId: 'user_123', sessionId: 'session_123' });
  const payload = jwt.decode(token);

  assert.equal(payload.sid, 'session_123');
});

test('generated token contains iat', () => {
  const token = signAccessToken({ userId: 'user_123', sessionId: 'session_123' });
  const payload = jwt.decode(token);

  assert.equal(typeof payload.iat, 'number');
});

test('generated token contains exp', () => {
  const token = signAccessToken({ userId: 'user_123', sessionId: 'session_123' });
  const payload = jwt.decode(token);

  assert.equal(typeof payload.exp, 'number');
});

test('expiration is approximately 15 minutes', () => {
  const token = signAccessToken({ userId: 'user_123', sessionId: 'session_123' });
  const payload = jwt.decode(token);
  const lifetimeSeconds = payload.exp - payload.iat;

  assert.ok(Math.abs(lifetimeSeconds - 900) <= 5);
});

test('token uses HS256', () => {
  const token = signAccessToken({ userId: 'user_123', sessionId: 'session_123' });
  const header = jwt.decode(token, { complete: true }).header;

  assert.equal(header.alg, 'HS256');
});

test('valid token verifies successfully', () => {
  const token = signAccessToken({ userId: 'user_123', sessionId: 'session_123' });

  const payload = verifyAccessToken(token);

  assert.equal(payload.sub, 'user_123');
  assert.equal(payload.sid, 'session_123');
});

test('wrong secret causes verification failure', () => {
  const wrongSecretToken = jwt.sign({ sub: 'user_123', sid: 'session_123' }, 'wrong-secret', {
    algorithm: 'HS256',
    expiresIn: 900,
  });

  assert.throws(() => verifyAccessToken(wrongSecretToken), /Invalid or expired access token/i);
});

test('tampered token fails verification', () => {
  const token = signAccessToken({ userId: 'user_123', sessionId: 'session_123' });
  const tampered = token.endsWith('A')
    ? `${token.slice(0, -1)}B`
    : `${token.slice(0, -1)}A`;

  assert.throws(() => verifyAccessToken(tampered), /Invalid or expired access token/i);
});

test('expired token fails verification', () => {
  const expiredToken = jwt.sign({ sub: 'user_123', sid: 'session_123' }, jwtConfig.secret, {
    algorithm: 'HS256',
    expiresIn: -1,
  });

  assert.throws(() => verifyAccessToken(expiredToken), /Invalid or expired access token/i);
});

test('token signed with another algorithm is rejected', () => {
  const otherAlgorithmToken = jwt.sign({ sub: 'user_123', sid: 'session_123' }, jwtConfig.secret, {
    algorithm: 'HS384',
    expiresIn: 900,
  });

  assert.throws(() => verifyAccessToken(otherAlgorithmToken), /Invalid or expired access token/i);
});

test('missing userId is rejected', () => {
  assert.throws(() => signAccessToken({ sessionId: 'session_123' }), /userId is required/i);
});

test('missing sessionId is rejected', () => {
  assert.throws(() => signAccessToken({ userId: 'user_123' }), /sessionId is required/i);
});

test('arbitrary extra payload fields cannot be injected through signAccessToken()', () => {
  const token = signAccessToken({
    userId: 'user_123',
    sessionId: 'session_123',
    email: 'user@example.com',
    role: 'admin',
  });

  const payload = verifyAccessToken(token);

  assert.equal(payload.email, undefined);
  assert.equal(payload.role, undefined);
  assert.deepEqual(Object.keys(payload).sort(), ['exp', 'iat', 'sid', 'sub']);
});

test('JWT secret is never returned or logged', () => {
  const forgedToken = jwt.sign({ sub: 'user_123', sid: 'session_123' }, 'wrong-secret', {
    algorithm: 'HS256',
    expiresIn: 900,
  });

  assert.throws(() => verifyAccessToken(forgedToken), (error) => {
    assert.equal(error.name, 'JwtTokenError');
    assert.match(error.message, /Invalid or expired access token/i);
    assert.doesNotMatch(error.message, /wrong-secret|JWT_SECRET|secret/i);
    return true;
  });
});
