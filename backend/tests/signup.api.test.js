const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const app = require('../src/app');
const { connectTestDb, clearCollections } = require('./testDb');
const { User, Organization, Membership, RefreshTokenSession } = require('../src/models');

describe('Signup API', () => {
  let server;

  before(async () => {
    await connectTestDb(mongoose);
    await clearCollections([User, Organization, Membership, RefreshTokenSession]);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
  });

  after(async () => {
    await clearCollections([User, Organization, Membership, RefreshTokenSession]);
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
    await mongoose.disconnect();
  });

  test('creates a new account with organization and admin membership', async () => {
    const payload = {
      name: 'Alice Example',
      email: 'ALICE@example.com',
      password: 'StrongPass!123',
      organizationName: 'Acme Studio',
    };

    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.equal(response.status, 201);

    const body = await response.json();
    assert.equal(body.status, 'success');
    assert.equal(body.message, 'Account created successfully');
    assert.equal(body.data.user.email, 'alice@example.com');
    assert.equal(body.data.organization.name, 'Acme Studio');
    assert.equal(body.data.membership.role, 'admin');
    assert.equal(body.data.user.status, 'active');
    assert.equal(typeof body.data.accessToken, 'string');
    assert.equal(typeof body.data.refreshToken, 'string');
    assert.equal(body.data.user.passwordHash, undefined);

    const createdUser = await User.findOne({ email: 'alice@example.com' });
    assert.ok(createdUser);

    const createdOrganization = await Organization.findOne({ slug: 'acme-studio' });
    assert.ok(createdOrganization);

    const createdMembership = await Membership.findOne({
      userId: createdUser._id,
      organizationId: createdOrganization._id,
    });
    assert.ok(createdMembership);
    assert.equal(createdMembership.role, 'admin');
  });

  test('rejects duplicate email addresses', async () => {
    await User.create({
      name: 'Existing User',
      email: 'existing@example.com',
      passwordHash: 'x'.repeat(60),
      status: 'active',
    });

    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another User',
        email: 'existing@example.com',
        password: 'StrongPass!123',
        organizationName: 'Existing Org',
      }),
    });

    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.code, 'EMAIL_ALREADY_EXISTS');
  });
});
