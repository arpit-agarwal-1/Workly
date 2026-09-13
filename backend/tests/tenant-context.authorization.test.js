const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const tenantContext = require('../src/middleware/tenantContext');
const authorize = require('../src/middleware/authorize');
const { User, Organization, Membership, RefreshTokenSession } = require('../src/models');
const { connectTestDb, clearCollections } = require('./testDb');

function runTenantContext({ userId, organizationId, body, query, headers = {} }) {
  const req = {
    user: userId ? { userId } : undefined,
    body,
    query,
    get(name) {
      return headers[name.toLowerCase()];
    },
  };
  return new Promise((resolve) => {
    tenantContext(req, {}, (error) => resolve({ req, error }));
  });
}

function runAuthorization({ user, tenant, permission }) {
  const req = { user, tenant };
  return new Promise((resolve) => {
    authorize(permission)(req, {}, (error) => resolve({ req, error }));
  });
}

async function createTenantFixture({ role = 'member', membershipStatus = 'active', organizationStatus = 'active' } = {}) {
  const user = await User.create({
    name: `Tenant ${role}`,
    email: `${role}-${new mongoose.Types.ObjectId()}@example.com`,
    passwordHash: 'x'.repeat(60),
    status: 'active',
  });
  const organization = await Organization.create({
    name: `Tenant ${role} Org`,
    slug: `tenant-${role}-${new mongoose.Types.ObjectId().toString().slice(-8)}`,
    status: organizationStatus,
  });
  const membership = await Membership.create({
    userId: user._id,
    organizationId: organization._id,
    role,
    status: membershipStatus,
  });

  return { user, organization, membership };
}

describe('Milestone I tenant context and authorization', () => {
  before(async () => {
    await connectTestDb(mongoose);
  });

  beforeEach(async () => {
    await clearCollections([User, Organization, Membership, RefreshTokenSession]);
  });

  after(async () => {
    await clearCollections([User, Organization, Membership, RefreshTokenSession]);
    await mongoose.disconnect();
  });

  test('resolves active tenant context from authenticated identity and selected organization', async () => {
    const fixture = await createTenantFixture({ role: 'manager' });
    const result = await runTenantContext({
      userId: fixture.user._id.toString(),
      organizationId: fixture.organization._id.toString(),
      headers: { 'x-organization-id': fixture.organization._id.toString() },
    });

    assert.equal(result.error, undefined);
    assert.deepEqual(result.req.tenant, {
      userId: fixture.user._id.toString(),
      organizationId: fixture.organization._id.toString(),
      membershipId: fixture.membership._id.toString(),
      role: 'manager',
      permissions: [
        'organization:read', 'members:read', 'members:invite', 'members:update',
        'projects:create', 'projects:read', 'projects:update', 'tasks:create',
        'tasks:read', 'tasks:update', 'teams:create', 'teams:read', 'teams:update',
      ],
    });
  });

  test('rejects unauthenticated requests and requires explicit tenant selection', async () => {
    const missingAuth = await runTenantContext({ organizationId: new mongoose.Types.ObjectId().toString() });
    assert.equal(missingAuth.error.statusCode, 401);
    assert.equal(missingAuth.error.code, 'AUTH_REQUIRED');

    const fixture = await createTenantFixture();
    const missingSelection = await runTenantContext({ userId: fixture.user._id.toString() });
    assert.equal(missingSelection.error.statusCode, 403);
    assert.equal(missingSelection.error.code, 'TENANT_CONTEXT_REQUIRED');
  });

  test('rejects missing, inactive, and unassociated tenant memberships', async () => {
    const fixture = await createTenantFixture({ membershipStatus: 'invited' });
    const inactiveMembership = await runTenantContext({
      userId: fixture.user._id.toString(),
      headers: { 'x-organization-id': fixture.organization._id.toString() },
    });
    assert.equal(inactiveMembership.error.statusCode, 403);

    const missingOrganization = new mongoose.Types.ObjectId().toString();
    const missingMembership = await runTenantContext({
      userId: fixture.user._id.toString(),
      headers: { 'x-organization-id': missingOrganization },
    });
    assert.equal(missingMembership.error.statusCode, 403);

    const inactiveOrganizationFixture = await createTenantFixture({ organizationStatus: 'inactive' });
    const inactiveOrganization = await runTenantContext({
      userId: inactiveOrganizationFixture.user._id.toString(),
      headers: { 'x-organization-id': inactiveOrganizationFixture.organization._id.toString() },
    });
    assert.equal(inactiveOrganization.error.statusCode, 403);
  });

  test('derives admin, manager, and member permissions from membership roles', async (t) => {
    const cases = [
      ['admin', 'projects:delete', 'teams:archive'],
      ['manager', 'projects:create', 'projects:delete'],
      ['member', 'projects:read', 'projects:create'],
    ];

    for (const [role, allowedPermission, deniedPermission] of cases) {
      await t.test(role, async () => {
        const fixture = await createTenantFixture({ role });
        const context = await runTenantContext({
          userId: fixture.user._id.toString(),
          headers: { 'x-organization-id': fixture.organization._id.toString() },
        });

        const allowedResult = await runAuthorization({ user: { userId: fixture.user._id.toString() }, tenant: context.req.tenant, permission: allowedPermission });
        assert.equal(allowedResult.error, undefined);

        const deniedResult = await runAuthorization({ user: { userId: fixture.user._id.toString() }, tenant: context.req.tenant, permission: deniedPermission });
        assert.equal(deniedResult.error.statusCode, 403);
        assert.equal(deniedResult.error.code, 'FORBIDDEN');
      });
    }
  });

  test('rejects an authenticated request without DB-derived tenant context', async () => {
    const result = await runAuthorization({
      user: { userId: new mongoose.Types.ObjectId().toString() },
      permission: 'organization:read',
    });

    assert.equal(result.error.statusCode, 403);
    assert.equal(result.error.code, 'TENANT_CONTEXT_REQUIRED');
    assert.equal(result.error.message, 'Tenant context is required.');
  });

  test('does not trust client role, permissions, identity, or organization fields', async () => {
    const fixture = await createTenantFixture({ role: 'member' });
    const result = await runTenantContext({
      userId: fixture.user._id.toString(),
      organizationId: new mongoose.Types.ObjectId().toString(),
      body: {
        userId: fixture.user._id.toString(),
        role: 'admin',
        permissions: ['projects:delete'],
        organizationId: fixture.organization._id.toString(),
      },
      query: { organizationId: fixture.organization._id.toString(), role: 'admin' },
      headers: { 'x-organization-id': fixture.organization._id.toString() },
    });

    assert.equal(result.error, undefined);
    assert.equal(result.req.tenant.role, 'member');
    assert.equal(result.req.tenant.permissions.includes('projects:delete'), false);
    assert.equal(result.req.tenant.userId, fixture.user._id.toString());
  });

  test('isolates multiple organizations and rejects an organization without active membership', async () => {
    const user = await User.create({
      name: 'Multi Tenant User',
      email: 'multi-tenant@example.com',
      passwordHash: 'x'.repeat(60),
      status: 'active',
    });
    const allowedOrganization = await Organization.create({ name: 'Allowed Org', slug: 'allowed-org', status: 'active' });
    const otherOrganization = await Organization.create({ name: 'Other Org', slug: 'other-org', status: 'active' });
    await Membership.create({ userId: user._id, organizationId: allowedOrganization._id, role: 'admin', status: 'active' });

    const allowed = await runTenantContext({
      userId: user._id.toString(),
      headers: { 'x-organization-id': allowedOrganization._id.toString() },
    });
    assert.equal(allowed.error, undefined);
    assert.equal(allowed.req.tenant.organizationId, allowedOrganization._id.toString());

    const denied = await runTenantContext({
      userId: user._id.toString(),
      headers: { 'x-organization-id': otherOrganization._id.toString() },
    });
    assert.equal(denied.error.statusCode, 403);
    assert.equal(denied.error.code, 'TENANT_CONTEXT_REQUIRED');
  });
});
