const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const app = require('../src/app');
const { connectTestDb, clearCollections } = require('./testDb');
const { User, Organization, Membership, RefreshTokenSession } = require('../src/models');
const { hashPassword } = require('../src/utils/password');
const {
  generateRefreshToken,
  generateRefreshTokenFamilyId,
  hashRefreshToken,
} = require('../src/utils/refreshToken');

const PASSWORD = 'StrongPass!123';

async function seedAccount(overrides = {}) {
  const user = await User.create({
    name: overrides.userName || 'Refresh User',
    email: overrides.email || 'refresh@example.com',
    passwordHash: await hashPassword(PASSWORD),
    status: overrides.userStatus || 'active',
  });
  const organization = await Organization.create({
    name: overrides.organizationName || 'Refresh Org',
    slug: overrides.slug || 'refresh-org',
    status: overrides.organizationStatus || 'active',
  });
  const membership = await Membership.create({
    userId: user._id,
    organizationId: organization._id,
    role: 'member',
    status: overrides.membershipStatus || 'active',
  });
  const refreshToken = generateRefreshToken();
  const session = await RefreshTokenSession.create({
    userId: user._id,
    organizationId: organization._id,
    tokenHash: hashRefreshToken(refreshToken),
    familyId: overrides.familyId || generateRefreshTokenFamilyId(),
    expiresAt: overrides.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    revokedAt: overrides.revokedAt || null,
  });

  return { user, organization, membership, refreshToken, session };
}

describe('Refresh API', () => {
  let server;
  let baseUrl;

  before(async () => {
    await connectTestDb(mongoose);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await clearCollections([User, Organization, Membership, RefreshTokenSession]);
  });

  after(async () => {
    await clearCollections([User, Organization, Membership, RefreshTokenSession]);
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await mongoose.disconnect();
  });

  async function refreshRequest(cookie, options = {}) {
    return fetch(`${baseUrl}/api/v1/auth/refresh${options.query || ''}`, {
      method: 'POST',
      headers: {
        ...(cookie ? { Cookie: `refreshToken=${encodeURIComponent(cookie)}` } : {}),
        ...(options.headers || {}),
        'Content-Type': 'application/json',
      },
      body: options.body || undefined,
    });
  }

  test('rotates a valid refresh token and issues a new access token', async () => {
    const account = await seedAccount();
    const response = await refreshRequest(account.refreshToken);
    const body = await response.json();
    const cookie = response.headers.get('set-cookie');

    assert.equal(response.status, 200);
    assert.equal(body.status, 'success');
    assert.equal(body.message, 'Token refreshed successfully');
    assert.equal(typeof body.data.accessToken, 'string');
    assert.equal(body.data.expiresIn, 900);
    assert.equal(body.data.refreshToken, undefined);
    assert.match(cookie, /refreshToken=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Path=\/api\/v1\/auth\/refresh/);
    assert.match(cookie, /Max-Age=2592000/);

    const sessions = await RefreshTokenSession.find({ userId: account.user._id }).select('+tokenHash').lean();
    assert.equal(sessions.length, 2);
    assert.ok(sessions.some((session) => session._id.equals(account.session._id) && session.revokedAt));

    const newToken = decodeURIComponent(cookie.match(/refreshToken=([^;]+)/)[1]);
    const secondResponse = await refreshRequest(newToken);
    assert.equal(secondResponse.status, 200);

    const oldTokenResponse = await refreshRequest(account.refreshToken);
    assert.equal(oldTokenResponse.status, 401);
    const oldTokenBody = await oldTokenResponse.json();
    assert.equal(oldTokenBody.code, 'AUTH_INVALID_CREDENTIALS');
    assert.equal(oldTokenBody.data, undefined);

    const descendantCookie = secondResponse.headers.get('set-cookie');
    const descendantToken = decodeURIComponent(descendantCookie.match(/refreshToken=([^;]+)/)[1]);
    const descendantResponse = await refreshRequest(descendantToken);
    assert.equal(descendantResponse.status, 401);
  });

  test('rejects missing, invalid, expired, revoked, and inactive sessions generically', async (t) => {
    const cases = [
      ['missing cookie', undefined],
      ['invalid cookie', 'not-a-valid-refresh-token'],
      ['expired session', generateRefreshToken(), { expiresAt: new Date(Date.now() - 1000) }],
      ['revoked session', generateRefreshToken(), { revokedAt: new Date() }],
      ['inactive user', generateRefreshToken(), { userStatus: 'inactive' }],
      ['inactive organization', generateRefreshToken(), { organizationStatus: 'inactive' }],
      ['inactive membership', generateRefreshToken(), { membershipStatus: 'invited' }],
    ];

    for (const [name, token, overrides] of cases) {
      await t.test(name, async () => {
        const account = overrides ? await seedAccount(overrides) : null;
        const response = await refreshRequest(account ? account.refreshToken : token);
        const body = await response.json();
        assert.equal(response.status, 401);
        assert.equal(body.code, 'AUTH_INVALID_CREDENTIALS');
        assert.equal(body.message, 'Authentication failed.');
      });
    }
  });

  test('ignores refresh tokens outside the HttpOnly cookie', async () => {
    const account = await seedAccount();
    const response = await refreshRequest(undefined, {
      query: `?refreshToken=${encodeURIComponent(account.refreshToken)}`,
      body: JSON.stringify({ refreshToken: account.refreshToken }),
    });

    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.code, 'AUTH_INVALID_CREDENTIALS');
  });

  test('detects reuse of a rotated token without issuing credentials', async () => {
    const account = await seedAccount();
    const firstResponse = await refreshRequest(account.refreshToken);
    assert.equal(firstResponse.status, 200);

    const reusedResponse = await refreshRequest(account.refreshToken);
    const body = await reusedResponse.json();
    assert.equal(reusedResponse.status, 401);
    assert.equal(body.data, undefined);
    assert.equal(reusedResponse.headers.get('set-cookie'), null);
  });

  test('does not invalidate an independent device family', async () => {
    const first = await seedAccount();
    const second = await seedAccount({ email: 'refresh-device-2@example.com', slug: 'refresh-device-2' });
    const firstResponse = await refreshRequest(first.refreshToken);
    assert.equal(firstResponse.status, 200);

    const firstChild = decodeURIComponent(firstResponse.headers.get('set-cookie').match(/refreshToken=([^;]+)/)[1]);
    const reuseResponse = await refreshRequest(first.refreshToken);
    assert.equal(reuseResponse.status, 401);

    const childResponse = await refreshRequest(firstChild);
    assert.equal(childResponse.status, 401);
    const independentResponse = await refreshRequest(second.refreshToken);
    assert.equal(independentResponse.status, 200);
  });

  test('allows at most one successful rotation for concurrent reuse of one token', async () => {
    const account = await seedAccount();
    const responses = await Promise.all([
      refreshRequest(account.refreshToken),
      refreshRequest(account.refreshToken),
    ]);

    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 401]);
    const sessions = await RefreshTokenSession.find({ familyId: account.session.familyId }).lean();
    assert.equal(sessions.length, 2);
    assert.equal(sessions.filter((session) => !session.revokedAt).length, 0);
  });

  test('stores only a hash and never returns a raw refresh token', async () => {
    const account = await seedAccount();
    const response = await refreshRequest(account.refreshToken);
    const body = await response.json();
    const sessions = await RefreshTokenSession.find({ familyId: account.session.familyId }).select('+tokenHash').lean();

    assert.equal(response.status, 200);
    assert.equal(body.data.refreshToken, undefined);
    assert.ok(sessions.every((session) => session.tokenHash));
    assert.ok(sessions.every((session) => session.tokenHash !== account.refreshToken));
  });
});
