const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const app = require('../src/app');
const { connectTestDb, clearCollections } = require('./testDb');
const { User, Organization, Membership, RefreshTokenSession, Project } = require('../src/models');
const { signAccessToken } = require('../src/utils/jwt');

async function createTenant({ email, role = 'admin', organization, membershipStatus = 'active' }) {
  const user = await User.create({ name: email.split('@')[0], email, passwordHash: 'x'.repeat(60), status: 'active' });
  const org = organization || await Organization.create({ name: `${email} Org`, slug: email.split('@')[0] });
  const membership = await Membership.create({ userId: user._id, organizationId: org._id, role, status: membershipStatus });
  const token = signAccessToken({ userId: user._id.toString(), sessionId: new mongoose.Types.ObjectId().toString() });
  return { user, organization: org, membership, token };
}

describe('Organization, Members, and Projects API', () => {
  let server;
  let baseUrl;

  before(async () => {
    await connectTestDb(mongoose);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await clearCollections([User, Organization, Membership, RefreshTokenSession, Project]);
  });

  after(async () => {
    await clearCollections([User, Organization, Membership, RefreshTokenSession, Project]);
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await mongoose.disconnect();
  });

  async function request(path, fixture, options = {}) {
    return fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${fixture.token}`,
        'X-Organization-Id': fixture.organization._id.toString(),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  }

  test('reads and updates only the selected organization', async () => {
    const fixture = await createTenant({ email: 'org-admin@example.com' });
    const read = await request('/api/v1/organization', fixture);
    assert.equal(read.status, 200);
    assert.equal((await read.json()).data._id, fixture.organization._id.toString());

    const update = await request('/api/v1/organization', fixture, { method: 'PATCH', body: { name: 'Updated Org' } });
    assert.equal(update.status, 200);
    assert.equal((await update.json()).data.name, 'Updated Org');

    const forbiddenFields = await request('/api/v1/organization', fixture, { method: 'PATCH', body: { organizationId: new mongoose.Types.ObjectId().toString(), slug: 'changed', status: 'inactive' } });
    assert.equal(forbiddenFields.status, 400);

    const member = await createTenant({ email: 'org-member@example.com', role: 'member', organization: fixture.organization });
    const unauthorizedUpdate = await request('/api/v1/organization', member, { method: 'PATCH', body: { name: 'Blocked' } });
    assert.equal(unauthorizedUpdate.status, 403);
  });

  test('rejects organization access without tenant context and cross-tenant selection', async () => {
    const first = await createTenant({ email: 'first@example.com' });
    const second = await createTenant({ email: 'second@example.com' });
    const missing = await fetch(`${baseUrl}/api/v1/organization`, { headers: { Authorization: `Bearer ${first.token}` } });
    assert.equal(missing.status, 403);

    const crossTenant = await fetch(`${baseUrl}/api/v1/organization`, { headers: { Authorization: `Bearer ${first.token}`, 'X-Organization-Id': second.organization._id.toString() } });
    assert.equal(crossTenant.status, 403);
  });

  test('lists and reads scoped members without sensitive user fields', async () => {
    const fixture = await createTenant({ email: 'members-admin@example.com' });
    const member = await createTenant({ email: 'member@example.com', role: 'member', organization: fixture.organization });
    const response = await request('/api/v1/members?page=1&limit=1', fixture);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.data.items.length, 1);
    assert.equal(body.data.total, 2);
    assert.equal(body.data.items[0].user.passwordHash, undefined);
    assert.equal(body.data.items[0].user.refreshToken, undefined);

    const detail = await request(`/api/v1/members/${member.membership._id}`, fixture);
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).data.user.email, 'member@example.com');

    const invalidPage = await request('/api/v1/members?page=0&limit=101', fixture);
    assert.equal(invalidPage.status, 400);
  });

  test('updates member role and status only within the selected organization', async () => {
    const fixture = await createTenant({ email: 'manage-admin@example.com' });
    const member = await createTenant({ email: 'managed@example.com', role: 'member', organization: fixture.organization });
    const role = await request(`/api/v1/members/${member.membership._id}/role`, fixture, { method: 'PATCH', body: { role: 'manager', organizationId: new mongoose.Types.ObjectId().toString() } });
    assert.equal(role.status, 400);

    const validRole = await request(`/api/v1/members/${member.membership._id}/role`, fixture, { method: 'PATCH', body: { role: 'manager' } });
    assert.equal(validRole.status, 200);
    assert.equal((await validRole.json()).data.role, 'manager');
    const validStatus = await request(`/api/v1/members/${member.membership._id}/status`, fixture, { method: 'PATCH', body: { status: 'removed' } });
    assert.equal(validStatus.status, 200);
    assert.equal((await validStatus.json()).data.status, 'removed');
  });

  test('enforces project CRUD permissions by role and organization scope', async () => {
    const org = await Organization.create({ name: 'Project Org', slug: 'project-org' });
    const admin = await createTenant({ email: 'project-admin@example.com', role: 'admin', organization: org });
    const manager = await createTenant({ email: 'project-manager@example.com', role: 'manager', organization: org });
    const member = await createTenant({ email: 'project-member@example.com', role: 'member', organization: org });
    const other = await createTenant({ email: 'other-project@example.com', role: 'admin' });

    const clientOverride = await request('/api/v1/projects', admin, { method: 'POST', body: { name: 'Blocked', organizationId: other.organization._id.toString() } });
    assert.equal(clientOverride.status, 400);
    const created = await request('/api/v1/projects', admin, { method: 'POST', body: { name: 'Alpha', description: 'First' } });
    assert.equal(created.status, 201);
    const project = (await created.json()).data;
    assert.equal(project.organizationId, org._id.toString());

    const managerUpdate = await request(`/api/v1/projects/${project._id}`, manager, { method: 'PATCH', body: { name: 'Manager Updated' } });
    assert.equal(managerUpdate.status, 200);
    const projectList = await request('/api/v1/projects?page=1&limit=1', member);
    assert.equal(projectList.status, 200);
    assert.equal((await projectList.json()).data.limit, 1);
    const managerDelete = await request(`/api/v1/projects/${project._id}`, manager, { method: 'DELETE' });
    assert.equal(managerDelete.status, 403);

    const memberRead = await request(`/api/v1/projects/${project._id}`, member);
    assert.equal(memberRead.status, 200);
    const memberWrite = await request(`/api/v1/projects/${project._id}`, member, { method: 'PATCH', body: { name: 'Nope' } });
    assert.equal(memberWrite.status, 403);

    const crossTenant = await request(`/api/v1/projects/${project._id}`, other);
    assert.equal(crossTenant.status, 404);
    const deleted = await request(`/api/v1/projects/${project._id}`, admin, { method: 'DELETE' });
    assert.equal(deleted.status, 204);
  });
});
