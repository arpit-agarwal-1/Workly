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

async function seedSession() {
  const user = await User.create({ name: 'Logout User', email: 'logout@example.com', passwordHash: await hashPassword('StrongPass!123') });
  const organization = await Organization.create({ name: 'Logout Org', slug: 'logout-org' });
  await Membership.create({ userId: user._id, organizationId: organization._id, role: 'member', status: 'active' });
  const refreshToken = generateRefreshToken();
  const session = await RefreshTokenSession.create({
    userId: user._id,
    organizationId: organization._id,
    tokenHash: hashRefreshToken(refreshToken),
    familyId: generateRefreshTokenFamilyId(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  return { refreshToken, session };
}

describe('Logout API', () => {
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

  async function logoutRequest(token) {
    return fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: token ? { Cookie: `refreshToken=${encodeURIComponent(token)}` } : {},
    });
  }

  test('revokes the session, preserves the record, and clears the cookie', async () => {
    const { refreshToken, session } = await seedSession();
    const response = await logoutRequest(refreshToken);
    const body = await response.json();
    const cookie = response.headers.get('set-cookie');

    assert.equal(response.status, 200);
    assert.deepEqual(body, { status: 'success', message: 'Logged out successfully' });
    assert.match(cookie, /refreshToken=;/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Path=\/api\/v1\/auth\/refresh/);

    const storedSession = await RefreshTokenSession.findById(session._id).lean();
    assert.ok(storedSession);
    assert.ok(storedSession.revokedAt);
  });

  test('is idempotent for missing, invalid, and already-revoked cookies', async () => {
    const missingResponse = await logoutRequest();
    assert.equal(missingResponse.status, 200);

    const invalidResponse = await logoutRequest('invalid-refresh-token');
    assert.equal(invalidResponse.status, 200);

    const { refreshToken, session } = await seedSession();
    session.revokedAt = new Date();
    await session.save();
    const response = await logoutRequest(refreshToken);
    assert.equal(response.status, 200);

    const storedSession = await RefreshTokenSession.findById(session._id).lean();
    assert.ok(storedSession.revokedAt);
    assert.ok(storedSession);
  });
});
