const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const app = require('../src/app');
const { connectTestDb, clearCollections } = require('./testDb');
const { User, Organization, Membership, RefreshTokenSession } = require('../src/models');
const { hashPassword } = require('../src/utils/password');

const LOGIN_PASSWORD = 'StrongPass!123';

async function createUser({
  name,
  email,
  status = 'active',
  organization,
  membershipStatus = 'active',
  role = 'member',
}) {
  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(LOGIN_PASSWORD),
    status,
  });

  if (organization) {
    const createdOrganization = await Organization.create(organization);
    await Membership.create({
      userId: user._id,
      organizationId: createdOrganization._id,
      role,
      status: membershipStatus,
    });
  }

  return user;
}

describe('Login API', () => {
  let server;
  let activeUser;

  before(async () => {
    await connectTestDb(mongoose);
    await clearCollections([User, Organization, Membership, RefreshTokenSession]);

    activeUser = await createUser({
      name: 'Login User',
      email: 'login@example.com',
      organization: {
        name: 'Login Org',
        slug: 'login-org',
        status: 'active',
      },
      role: 'manager',
    });

    await createUser({
      name: 'Inactive User',
      email: 'inactive@example.com',
      status: 'inactive',
      organization: { name: 'Inactive User Org', slug: 'inactive-user-org', status: 'active' },
    });

    await createUser({
      name: 'Disabled User',
      email: 'disabled@example.com',
      status: 'disabled',
      organization: { name: 'Disabled User Org', slug: 'disabled-user-org', status: 'active' },
    });

    await createUser({
      name: 'Inactive Org User',
      email: 'inactive-org@example.com',
      organization: { name: 'Inactive Org', slug: 'inactive-org', status: 'inactive' },
    });

    await createUser({
      name: 'Inactive Membership User',
      email: 'inactive-membership@example.com',
      membershipStatus: 'invited',
      organization: { name: 'Inactive Membership Org', slug: 'inactive-membership-org', status: 'active' },
    });

    await createUser({
      name: 'Missing Membership User',
      email: 'missing-membership@example.com',
    });

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
  });

  after(async () => {
    await clearCollections([User, Organization, Membership, RefreshTokenSession]);
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await mongoose.disconnect();
  });

  async function requestLogin(payload, headers = {}) {
    const port = server.address().port;
    return fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });
  }

  test('returns sanitized authentication context and refresh cookie', async () => {
    const response = await requestLogin({
      email: ' LOGIN@EXAMPLE.COM ',
      password: LOGIN_PASSWORD,
    }, { 'User-Agent': 'Login API Test' });

    assert.equal(response.status, 200);
    const body = await response.json();
    const cookie = response.headers.get('set-cookie');

    assert.equal(body.status, 'success');
    assert.equal(body.message, 'Login successful');
    assert.equal(typeof body.data.accessToken, 'string');
    assert.equal(body.data.expiresIn, 900);
    assert.deepEqual(body.data.user, {
      id: activeUser._id.toString(),
      name: 'Login User',
      email: 'login@example.com',
      status: 'active',
    });
    assert.deepEqual(body.data.organization, {
      id: body.data.organization.id,
      name: 'Login Org',
      slug: 'login-org',
      status: 'active',
    });
    assert.deepEqual(body.data.membership, {
      id: body.data.membership.id,
      role: 'manager',
      status: 'active',
    });
    assert.equal(body.data.refreshToken, undefined);
    assert.equal(body.data.passwordHash, undefined);
    assert.equal(body.data.tokenHash, undefined);
    assert.match(cookie, /refreshToken=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Path=\/api\/v1\/auth\/refresh/);
    assert.match(cookie, /Max-Age=2592000/);
    assert.match(cookie, /SameSite=Lax/);
    assert.doesNotMatch(cookie, /Secure/);
  });

  test('rejects invalid login payloads', async (t) => {
    const cases = [
      ['missing email', { password: LOGIN_PASSWORD }, 'email'],
      ['missing password', { email: 'login@example.com' }, 'password'],
      ['invalid email', { email: 'invalid-email', password: LOGIN_PASSWORD }, 'email'],
      ['short password', { email: 'login@example.com', password: 'short' }, 'password'],
      ['long password', { email: 'login@example.com', password: 'x'.repeat(129) }, 'password'],
      ['leading password whitespace', { email: 'login@example.com', password: ` ${LOGIN_PASSWORD}` }, 'password'],
      ['trailing password whitespace', { email: 'login@example.com', password: `${LOGIN_PASSWORD} ` }, 'password'],
      ['unexpected privileged field', { email: 'login@example.com', password: LOGIN_PASSWORD, role: 'admin' }, 'role'],
    ];

    for (const [name, payload, field] of cases) {
      await t.test(name, async () => {
        const response = await requestLogin(payload);
        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.code, 'VALIDATION_ERROR');
        assert.ok(body.details.some((detail) => detail.field === field));
      });
    }
  });

  test('returns the same generic authentication failure for invalid account states', async (t) => {
    const cases = [
      ['nonexistent email', 'missing@example.com'],
      ['incorrect password', 'login@example.com', 'WrongPass!123'],
      ['inactive user', 'inactive@example.com'],
      ['disabled user', 'disabled@example.com'],
      ['inactive organization', 'inactive-org@example.com'],
      ['inactive membership', 'inactive-membership@example.com'],
      ['missing membership', 'missing-membership@example.com'],
    ];

    for (const [name, email, password = LOGIN_PASSWORD] of cases) {
      await t.test(name, async () => {
        const response = await requestLogin({ email, password });
        assert.equal(response.status, 401);
        const body = await response.json();
        assert.equal(body.code, 'AUTH_INVALID_CREDENTIALS');
        assert.equal(body.message, 'Authentication failed.');
        assert.equal(body.data, undefined);
      });
    }
  });

  test('privileged client fields cannot influence authentication context', async () => {
    const response = await requestLogin({
      email: 'login@example.com',
      password: LOGIN_PASSWORD,
      organizationId: new mongoose.Types.ObjectId().toString(),
      permissions: ['owner'],
      status: 'disabled',
      refreshToken: 'client-controlled-token',
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.code, 'VALIDATION_ERROR');
    assert.equal(body.data, undefined);
  });
});
