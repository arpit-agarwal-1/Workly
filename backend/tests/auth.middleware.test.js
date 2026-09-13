const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const auth = require('../src/middleware/auth');
const { signAccessToken } = require('../src/utils/jwt');
const { jwtConfig, JWT_ALGORITHM } = require('../src/config/jwt');

function runMiddleware({ authorization, query, body, user }) {
  const req = {
    user,
    body,
    query,
    get(name) {
      return name.toLowerCase() === 'authorization' ? authorization : undefined;
    },
  };
  let nextError;
  let nextCalled = false;
  auth(req, {}, (error) => {
    nextError = error;
    nextCalled = true;
  });
  return { req, nextCalled, nextError };
}

describe('Authentication middleware', () => {
  test('accepts a valid Bearer access token and populates req.user', () => {
    const result = runMiddleware({
      authorization: `Bearer ${signAccessToken({ userId: '507f1f77bcf86cd799439011', sessionId: '507f1f77bcf86cd799439012' })}`,
    });

    assert.equal(result.nextCalled, true);
    assert.equal(result.nextError, undefined);
    assert.deepEqual(result.req.user, {
      userId: '507f1f77bcf86cd799439011',
      sub: '507f1f77bcf86cd799439011',
      sessionId: '507f1f77bcf86cd799439012',
      sid: '507f1f77bcf86cd799439012',
    });
  });

  test('rejects missing and malformed authorization headers', () => {
    for (const authorization of [undefined, '', 'Basic token', 'Bearer', 'Bearer   ', 'Bearer one two']) {
      const result = runMiddleware({ authorization });
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError.statusCode, 401);
      assert.equal(result.nextError.code, 'AUTH_REQUIRED');
    }
  });

  test('rejects invalid, expired, wrongly signed, and malformed-claim tokens', () => {
    const tokens = [
      'not-a-jwt',
      jwt.sign({ sub: '507f1f77bcf86cd799439011', sid: '507f1f77bcf86cd799439012' }, jwtConfig.secret, { algorithm: JWT_ALGORITHM, expiresIn: -1 }),
      jwt.sign({ sub: '507f1f77bcf86cd799439011', sid: '507f1f77bcf86cd799439012' }, 'wrong-secret', { algorithm: JWT_ALGORITHM }),
      jwt.sign({ sub: '507f1f77bcf86cd799439011', sid: '507f1f77bcf86cd799439012', role: 'admin' }, jwtConfig.secret, { algorithm: JWT_ALGORITHM }),
      jwt.sign({ sid: '507f1f77bcf86cd799439012' }, jwtConfig.secret, { algorithm: JWT_ALGORITHM }),
      jwt.sign({ sub: '507f1f77bcf86cd799439011' }, jwtConfig.secret, { algorithm: JWT_ALGORITHM }),
    ];

    for (const token of tokens) {
      const result = runMiddleware({ authorization: `Bearer ${token}` });
      assert.equal(result.nextError.statusCode, 401);
      assert.equal(result.nextError.code, 'AUTH_INVALID_TOKEN');
      assert.equal(result.nextError.stack, undefined);
    }
  });

  test('does not accept tokens from query/body or trust client req.user', () => {
    const result = runMiddleware({
      query: { accessToken: 'not-used' },
      body: { accessToken: 'not-used' },
      user: { userId: 'client-controlled' },
    });

    assert.equal(result.nextError.statusCode, 401);
    assert.equal(result.req.user, undefined);
  });
});
