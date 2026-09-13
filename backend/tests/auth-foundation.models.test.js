const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { User, Organization, Membership } = require('../src/models');
const { connectTestDb, clearCollections, getTestMongoUri } = require('./testDb');

describe('Auth foundation models', () => {
  before(async () => {
    await connectTestDb(mongoose);
    await clearCollections([User, Organization, Membership]);
  });

  after(async () => {
    await clearCollections([User, Organization, Membership]);
    await mongoose.disconnect();
  });

  test('tests fail safely when TEST_MONGODB_URI is not configured', async () => {
    const original = process.env.TEST_MONGODB_URI;
    delete process.env.TEST_MONGODB_URI;

    try {
      assert.throws(() => getTestMongoUri(), /TEST_MONGODB_URI is not configured/i);
    } finally {
      if (original) {
        process.env.TEST_MONGODB_URI = original;
      }
    }
  });

  test('User accepts valid data and normalizes email', async () => {
    const user = await User.create({
      name: 'Arpit Agarwal',
      email: ' ARPIT@EXAMPLE.COM ',
      passwordHash: 'a'.repeat(60),
    });

    assert.equal(user.email, 'arpit@example.com');
    assert.ok(user.passwordHash);
  });

  test('duplicate user email is rejected', async () => {
    await assert.rejects(
      User.create({
        name: 'Second User',
        email: 'arpit@example.com',
        passwordHash: 'b'.repeat(60),
      })
    );
  });

  test('passwordHash is not selected by default', async () => {
    const user = await User.findOne({ email: 'arpit@example.com' }).lean();
    assert.equal(user.passwordHash, undefined);
  });

  test('Organization slug normalization works', async () => {
    const org = await Organization.create({
      name: 'Workly Labs',
      slug: '  WORKLY-LABS  ',
    });

    assert.equal(org.slug, 'workly-labs');
  });

  test('Valid slug formats are accepted', async () => {
    await Organization.create({ name: 'Alpha', slug: 'alpha' });
    await Organization.create({ name: 'Alpha 2', slug: 'alpha-2' });
    await Organization.create({ name: 'My Company 123', slug: 'my-company-123' });
  });

  test('Invalid slug formats are rejected', async () => {
    await assert.rejects(
      Organization.create({ name: 'Invalid', slug: 'Workly Labs' })
    );
    await assert.rejects(
      Organization.create({ name: 'Invalid', slug: 'workly_labs' })
    );
    await assert.rejects(
      Organization.create({ name: 'Invalid', slug: 'workly labs' })
    );
    await assert.rejects(
      Organization.create({ name: 'Invalid', slug: 'workly@labs' })
    );
  });

  test('Organization slug uniqueness still works', async () => {
    await assert.rejects(
      Organization.create({
        name: 'Duplicate Org',
        slug: 'workly-labs',
      })
    );
  });

  test('Membership references User and Organization and rejects duplicate pairs', async () => {
    const user = await User.create({
      name: 'Rahul',
      email: 'rahul@example.com',
      passwordHash: 'c'.repeat(60),
    });

    const org = await Organization.create({
      name: 'Acme',
      slug: 'acme',
    });

    const membership = await Membership.create({
      userId: user._id,
      organizationId: org._id,
      role: 'admin',
    });

    assert.equal(membership.userId.toString(), user._id.toString());
    assert.equal(membership.organizationId.toString(), org._id.toString());

    await assert.rejects(
      Membership.create({
        userId: user._id,
        organizationId: org._id,
        role: 'member',
      })
    );
  });

  test('invalid roles are rejected', async () => {
    await assert.rejects(
      Membership.create({
        userId: new mongoose.Types.ObjectId(),
        organizationId: new mongoose.Types.ObjectId(),
        role: 'owner',
      })
    );
  });

  test('membership indexes exist as intended', async () => {
    const indexes = await Membership.collection.indexes();
    const indexKeys = indexes.map((index) => JSON.stringify(index.key));

    assert.ok(indexKeys.includes(JSON.stringify({ userId: 1, organizationId: 1 })));
    assert.ok(indexKeys.includes(JSON.stringify({ organizationId: 1, userId: 1 })));
    assert.ok(indexKeys.includes(JSON.stringify({ organizationId: 1, role: 1 })));
  });
});
