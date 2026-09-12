const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { User, Organization, RefreshTokenSession } = require('../src/models');
const { connectTestDb, clearCollections } = require('./testDb');

const createUniqueTokenHash = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;

describe('Refresh token session model', () => {
  let user;
  let organization;

  before(async () => {
    await connectTestDb(mongoose);
    await clearCollections([User, Organization, RefreshTokenSession]);

    user = await User.create({
      name: 'Refresh User',
      email: 'refresh-user@example.com',
      passwordHash: 'x'.repeat(60),
    });

    organization = await Organization.create({
      name: 'Refresh Org',
      slug: 'refresh-org',
    });
  });

  after(async () => {
    await clearCollections([User, Organization, RefreshTokenSession]);
    await mongoose.disconnect();
  });

  test('valid session can be created', async () => {
    const session = await RefreshTokenSession.create({
      userId: user._id,
      organizationId: organization._id,
      tokenHash: 'a'.repeat(64),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      userAgent: 'Workly-Test-Agent',
      ipAddress: '127.0.0.1',
    });

    assert.ok(session._id);
    assert.equal(session.userId.toString(), user._id.toString());
    assert.equal(session.organizationId.toString(), organization._id.toString());
  });

  test('userId is required', async () => {
    await assert.rejects(
      RefreshTokenSession.create({
        organizationId: organization._id,
        tokenHash: 'b'.repeat(64),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      })
    );
  });

  test('organizationId is required', async () => {
    await assert.rejects(
      RefreshTokenSession.create({
        userId: user._id,
        tokenHash: 'c'.repeat(64),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      })
    );
  });

  test('tokenHash is required', async () => {
    await assert.rejects(
      RefreshTokenSession.create({
        userId: user._id,
        organizationId: organization._id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      })
    );
  });

  test('tokenHash is unique', async () => {
    const tokenHash = createUniqueTokenHash('tokenHash-unique');
    const session = await RefreshTokenSession.create({
      userId: user._id,
      organizationId: organization._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });

    await assert.rejects(
      RefreshTokenSession.create({
        userId: user._id,
        organizationId: organization._id,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      })
    );

    await RefreshTokenSession.findByIdAndDelete(session._id);
  });

  test('tokenHash is excluded from normal queries because select:false', async () => {
    const session = await RefreshTokenSession.create({
      userId: user._id,
      organizationId: organization._id,
      tokenHash: createUniqueTokenHash('tokenHash-select-false'),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });

    const found = await RefreshTokenSession.findById(session._id).lean();
    assert.equal(found.tokenHash, undefined);
  });

  test('expiresAt is required', async () => {
    await assert.rejects(
      RefreshTokenSession.create({
        userId: user._id,
        organizationId: organization._id,
        tokenHash: 'f'.repeat(64),
      })
    );
  });

  test('revokedAt defaults to null', async () => {
    const session = await RefreshTokenSession.create({
      userId: user._id,
      organizationId: organization._id,
      tokenHash: createUniqueTokenHash('tokenHash-revokedAt'),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });

    assert.equal(session.revokedAt, null);
  });

  test('lastUsedAt defaults to null', async () => {
    const session = await RefreshTokenSession.create({
      userId: user._id,
      organizationId: organization._id,
      tokenHash: createUniqueTokenHash('tokenHash-lastUsedAt'),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });

    assert.equal(session.lastUsedAt, null);
  });

  test('timestamps exist', async () => {
    const session = await RefreshTokenSession.create({
      userId: user._id,
      organizationId: organization._id,
      tokenHash: createUniqueTokenHash('tokenHash-timestamps'),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });

    assert.ok(session.createdAt);
    assert.ok(session.updatedAt);
  });

  test('userAgent and IP address can be stored', async () => {
    const session = await RefreshTokenSession.create({
      userId: user._id,
      organizationId: organization._id,
      tokenHash: createUniqueTokenHash('tokenHash-userAgent'),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      userAgent: 'Mozilla/5.0',
      ipAddress: '10.0.0.1',
    });

    assert.equal(session.userAgent, 'Mozilla/5.0');
    assert.equal(session.ipAddress, '10.0.0.1');
  });

  test('TTL index exists on expiresAt', async () => {
    const indexes = await RefreshTokenSession.collection.indexes();
    const ttlIndex = indexes.find((index) => index.key && index.key.expiresAt === 1);

    assert.ok(ttlIndex);
    assert.equal(ttlIndex.expireAfterSeconds, 0);
  });

  test('indexes for userId, organizationId, and tokenHash exist', async () => {
    const indexes = await RefreshTokenSession.collection.indexes();

    assert.ok(indexes.some((index) => index.key && index.key.userId === 1));
    assert.ok(indexes.some((index) => index.key && index.key.organizationId === 1));
    assert.ok(indexes.some((index) => index.key && index.key.tokenHash === 1));
  });

  test('duplicate tokenHash is rejected', async () => {
    const duplicateTokenHash = createUniqueTokenHash('tokenHash-duplicate');

    await RefreshTokenSession.create({
      userId: user._id,
      organizationId: organization._id,
      tokenHash: duplicateTokenHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });

    await assert.rejects(
      RefreshTokenSession.create({
        userId: user._id,
        organizationId: organization._id,
        tokenHash: duplicateTokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      })
    );
  });
});
