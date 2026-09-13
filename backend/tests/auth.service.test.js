const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { authenticateUser, AuthenticationError, AUTH_INVALID_CREDENTIALS, REFRESH_SESSION_TTL_DAYS } = require('../src/services/authService');
const { User, Organization, Membership, RefreshTokenSession } = require('../src/models');
const { connectTestDb, clearCollections } = require('./testDb');
const { verifyAccessToken } = require('../src/utils/jwt');

describe('Authentication service', () => {
  let user;
  let organization;
  let membership;

  before(async () => {
    await connectTestDb(mongoose);
    await clearCollections([User, Organization, Membership, RefreshTokenSession]);

    user = await User.create({
      name: 'Auth User',
      email: '  AUTH-USER@EXAMPLE.COM  ',
      passwordHash: 'x'.repeat(60),
      status: 'active',
    });

    organization = await Organization.create({
      name: 'Auth Org',
      slug: 'auth-org',
      status: 'active',
    });

    membership = await Membership.create({
      userId: user._id,
      organizationId: organization._id,
      role: 'admin',
      status: 'active',
    });
  });

  after(async () => {
    await clearCollections([User, Organization, Membership, RefreshTokenSession]);
    await mongoose.disconnect();
  });

  test('successful authentication', async () => {
    const password = 'StrongPass!123';
    const realUser = await User.findById(user._id).select('+passwordHash');
    realUser.passwordHash = await require('../src/utils/password').hashPassword(password);
    await realUser.save();

    const result = await authenticateUser({
      email: 'auth-user@example.com',
      password,
      organizationId: organization._id.toString(),
    });

    assert.equal(result.user.id.toString(), user._id.toString());
    assert.equal(result.organization.id.toString(), organization._id.toString());
    assert.equal(result.membership.id.toString(), membership._id.toString());
    assert.equal(result.user.status, 'active');
    assert.equal(typeof result.accessToken, 'string');
    assert.equal(typeof result.refreshToken, 'string');
  });

  test('email normalization', async () => {
    const password = 'StrongPass!123';
    const realUser = await User.findById(user._id).select('+passwordHash');
    realUser.passwordHash = await require('../src/utils/password').hashPassword(password);
    await realUser.save();

    const result = await authenticateUser({
      email: '  AUTH-USER@EXAMPLE.COM  ',
      password,
      organizationId: organization._id.toString(),
    });

    assert.equal(result.user.email, 'auth-user@example.com');
  });

  test('wrong password fails', async () => {
    const password = 'StrongPass!123';
    const realUser = await User.findById(user._id).select('+passwordHash');
    realUser.passwordHash = await require('../src/utils/password').hashPassword(password);
    await realUser.save();

    await assert.rejects(
      authenticateUser({
        email: 'auth-user@example.com',
        password: 'WrongPass!123',
        organizationId: organization._id.toString(),
      }),
      (error) => {
        assert.equal(error.code, AUTH_INVALID_CREDENTIALS);
        assert.match(error.message, /authentication failed/i);
        return true;
      }
    );
  });

  test('nonexistent email fails with generic authentication error', async () => {
    await assert.rejects(
      authenticateUser({
        email: 'missing@example.com',
        password: 'StrongPass!123',
        organizationId: organization._id.toString(),
      }),
      (error) => {
        assert.equal(error.code, AUTH_INVALID_CREDENTIALS);
        return true;
      }
    );
  });

  test('inactive user cannot authenticate', async () => {
    const inactiveUser = await User.create({
      name: 'Inactive User',
      email: 'inactive-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword('StrongPass!123'),
      status: 'inactive',
    });

    const inactiveOrg = await Organization.create({
      name: 'Inactive Org',
      slug: 'inactive-org',
      status: 'active',
    });

    await Membership.create({
      userId: inactiveUser._id,
      organizationId: inactiveOrg._id,
      role: 'member',
      status: 'active',
    });

    await assert.rejects(
      authenticateUser({
        email: 'inactive-user@example.com',
        password: 'StrongPass!123',
        organizationId: inactiveOrg._id.toString(),
      }),
      (error) => {
        assert.equal(error.code, AUTH_INVALID_CREDENTIALS);
        return true;
      }
    );
  });

  test('disabled user cannot authenticate', async () => {
    const disabledUser = await User.create({
      name: 'Disabled User',
      email: 'disabled-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword('StrongPass!123'),
      status: 'disabled',
    });

    const disabledOrg = await Organization.create({
      name: 'Disabled Org',
      slug: 'disabled-org',
      status: 'active',
    });

    await Membership.create({
      userId: disabledUser._id,
      organizationId: disabledOrg._id,
      role: 'member',
      status: 'active',
    });

    await assert.rejects(
      authenticateUser({
        email: 'disabled-user@example.com',
        password: 'StrongPass!123',
        organizationId: disabledOrg._id.toString(),
      }),
      (error) => {
        assert.equal(error.code, AUTH_INVALID_CREDENTIALS);
        return true;
      }
    );
  });

  test('missing/inactive membership cannot authenticate', async () => {
    const memberUser = await User.create({
      name: 'Membership User',
      email: 'membership-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword('StrongPass!123'),
      status: 'active',
    });

    const org = await Organization.create({
      name: 'Membership Org',
      slug: 'membership-org',
      status: 'active',
    });

    await Membership.create({
      userId: memberUser._id,
      organizationId: org._id,
      role: 'member',
      status: 'invited',
    });

    await assert.rejects(
      authenticateUser({
        email: 'membership-user@example.com',
        password: 'StrongPass!123',
        organizationId: org._id.toString(),
      }),
      (error) => {
        assert.equal(error.code, AUTH_INVALID_CREDENTIALS);
        return true;
      }
    );
  });

  test('inactive organization cannot authenticate', async () => {
    const loginUser = await User.create({
      name: 'Org User',
      email: 'org-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword('StrongPass!123'),
      status: 'active',
    });

    const inactiveOrg = await Organization.create({
      name: 'Inactive Org 2',
      slug: 'inactive-org-2',
      status: 'inactive',
    });

    await Membership.create({
      userId: loginUser._id,
      organizationId: inactiveOrg._id,
      role: 'member',
      status: 'active',
    });

    await assert.rejects(
      authenticateUser({
        email: 'org-user@example.com',
        password: 'StrongPass!123',
        organizationId: inactiveOrg._id.toString(),
      }),
      (error) => {
        assert.equal(error.code, AUTH_INVALID_CREDENTIALS);
        return true;
      }
    );
  });

  test('passwordHash is never returned', async () => {
    const password = 'StrongPass!123';
    const authUser = await User.findById(user._id).select('+passwordHash');
    authUser.passwordHash = await require('../src/utils/password').hashPassword(password);
    await authUser.save();

    const result = await authenticateUser({
      email: 'auth-user@example.com',
      password,
      organizationId: organization._id.toString(),
    });

    assert.equal(result.user.passwordHash, undefined);
    assert.equal(result.passwordHash, undefined);
    assert.equal(result.user.email, 'auth-user@example.com');
  });

  test('successful authentication creates a RefreshTokenSession', async () => {
    const password = 'StrongPass!123';
    const sessionUser = await User.create({
      name: 'Session User',
      email: 'session-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword(password),
      status: 'active',
    });

    const sessionOrg = await Organization.create({
      name: 'Session Org',
      slug: 'session-org',
      status: 'active',
    });

    await Membership.create({
      userId: sessionUser._id,
      organizationId: sessionOrg._id,
      role: 'manager',
      status: 'active',
    });

    const result = await authenticateUser({
      email: 'session-user@example.com',
      password,
      organizationId: sessionOrg._id.toString(),
    });

    const session = await RefreshTokenSession.findOne({ userId: sessionUser._id, organizationId: sessionOrg._id }).select('+tokenHash').lean();
    assert.ok(session);
    assert.ok(session.tokenHash);
    assert.equal(session.userId.toString(), sessionUser._id.toString());
    assert.equal(session.organizationId.toString(), sessionOrg._id.toString());
    assert.equal(result.refreshToken, result.refreshToken);
  });

  test('stored session contains tokenHash, not plaintext refresh token', async () => {
    const password = 'StrongPass!123';
    const tokenUser = await User.create({
      name: 'Token User',
      email: 'token-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword(password),
      status: 'active',
    });

    const tokenOrg = await Organization.create({
      name: 'Token Org',
      slug: 'token-org',
      status: 'active',
    });

    await Membership.create({
      userId: tokenUser._id,
      organizationId: tokenOrg._id,
      role: 'member',
      status: 'active',
    });

    const result = await authenticateUser({
      email: 'token-user@example.com',
      password,
      organizationId: tokenOrg._id.toString(),
    });

    const session = await RefreshTokenSession.findOne({ userId: tokenUser._id, organizationId: tokenOrg._id }).select('+tokenHash').lean();
    assert.ok(session.tokenHash);
    assert.notEqual(session.tokenHash, result.refreshToken);
    assert.equal(result.refreshToken.includes('.'), false);
  });

  test('session expires approximately 30 days from creation', async () => {
    const password = 'StrongPass!123';
    const ttlUser = await User.create({
      name: 'TTL User',
      email: 'ttl-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword(password),
      status: 'active',
    });

    const ttlOrg = await Organization.create({
      name: 'TTL Org',
      slug: 'ttl-org',
      status: 'active',
    });

    await Membership.create({
      userId: ttlUser._id,
      organizationId: ttlOrg._id,
      role: 'member',
      status: 'active',
    });

    const result = await authenticateUser({
      email: 'ttl-user@example.com',
      password,
      organizationId: ttlOrg._id.toString(),
    });

    const session = await RefreshTokenSession.findOne({ userId: ttlUser._id, organizationId: ttlOrg._id }).lean();
    const ageSeconds = (session.expiresAt.getTime() - session.createdAt.getTime()) / 1000;
    const expected = REFRESH_SESSION_TTL_DAYS * 24 * 60 * 60;

    assert.ok(Math.abs(ageSeconds - expected) <= 5);
    assert.ok(result.refreshToken);
  });

  test('access token is generated successfully', async () => {
    const password = 'StrongPass!123';
    const accessUser = await User.create({
      name: 'Access User',
      email: 'access-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword(password),
      status: 'active',
    });

    const accessOrg = await Organization.create({
      name: 'Access Org',
      slug: 'access-org',
      status: 'active',
    });

    await Membership.create({
      userId: accessUser._id,
      organizationId: accessOrg._id,
      role: 'member',
      status: 'active',
    });

    const result = await authenticateUser({
      email: 'access-user@example.com',
      password,
      organizationId: accessOrg._id.toString(),
    });

    const payload = verifyAccessToken(result.accessToken);
    assert.equal(payload.sub, accessUser._id.toString());
    assert.ok(payload.sid);
    assert.ok(payload.iat);
    assert.ok(payload.exp);
  });

  test('access token contains only sub, sid, iat, exp', async () => {
    const password = 'StrongPass!123';
    const aclUser = await User.create({
      name: 'ACL User',
      email: 'acl-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword(password),
      status: 'active',
    });

    const aclOrg = await Organization.create({
      name: 'ACL Org',
      slug: 'acl-org',
      status: 'active',
    });

    await Membership.create({
      userId: aclUser._id,
      organizationId: aclOrg._id,
      role: 'member',
      status: 'active',
    });

    const result = await authenticateUser({
      email: 'acl-user@example.com',
      password,
      organizationId: aclOrg._id.toString(),
    });

    const payload = verifyAccessToken(result.accessToken);
    assert.deepEqual(Object.keys(payload).sort(), ['exp', 'iat', 'sid', 'sub']);
  });

  test('session userId matches authenticated user', async () => {
    const password = 'StrongPass!123';
    const sessionUser = await User.create({
      name: 'Match User',
      email: 'match-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword(password),
      status: 'active',
    });

    const sessionOrg = await Organization.create({
      name: 'Match Org',
      slug: 'match-org',
      status: 'active',
    });

    await Membership.create({
      userId: sessionUser._id,
      organizationId: sessionOrg._id,
      role: 'member',
      status: 'active',
    });

    const result = await authenticateUser({
      email: 'match-user@example.com',
      password,
      organizationId: sessionOrg._id.toString(),
    });

    const session = await RefreshTokenSession.findOne({ userId: sessionUser._id, organizationId: sessionOrg._id }).lean();
    assert.equal(session.userId.toString(), sessionUser._id.toString());
    assert.equal(result.user.id.toString(), sessionUser._id.toString());
  });

  test('session organizationId matches selected organization', async () => {
    const password = 'StrongPass!123';
    const orgUser = await User.create({
      name: 'Org Match User',
      email: 'org-match-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword(password),
      status: 'active',
    });

    const orgA = await Organization.create({
      name: 'Org A',
      slug: 'org-a',
      status: 'active',
    });

    const orgB = await Organization.create({
      name: 'Org B',
      slug: 'org-b',
      status: 'active',
    });

    await Membership.create({
      userId: orgUser._id,
      organizationId: orgA._id,
      role: 'member',
      status: 'active',
    });

    await Membership.create({
      userId: orgUser._id,
      organizationId: orgB._id,
      role: 'manager',
      status: 'active',
    });

    const result = await authenticateUser({
      email: 'org-match-user@example.com',
      password,
      organizationId: orgB._id.toString(),
    });

    const session = await RefreshTokenSession.findOne({ userId: orgUser._id, organizationId: orgB._id }).lean();
    assert.equal(session.organizationId.toString(), orgB._id.toString());
    assert.equal(result.organization.id.toString(), orgB._id.toString());
  });

  test('membership role comes from database', async () => {
    const password = 'StrongPass!123';
    const roleUser = await User.create({
      name: 'Role User',
      email: 'role-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword(password),
      status: 'active',
    });

    const roleOrg = await Organization.create({
      name: 'Role Org',
      slug: 'role-org',
      status: 'active',
    });

    await Membership.create({
      userId: roleUser._id,
      organizationId: roleOrg._id,
      role: 'manager',
      status: 'active',
    });

    const result = await authenticateUser({
      email: 'role-user@example.com',
      password,
      organizationId: roleOrg._id.toString(),
      role: 'admin',
      permissions: ['read:all'],
    });

    assert.equal(result.membership.role, 'manager');
    assert.equal(result.membership.role !== 'admin', true);
  });

  test('supplied client role and permissions are ignored', async () => {
    const password = 'StrongPass!123';
    const maliciousUser = await User.create({
      name: 'Malicious User',
      email: 'malicious-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword(password),
      status: 'active',
    });

    const maliciousOrg = await Organization.create({
      name: 'Malicious Org',
      slug: 'malicious-org',
      status: 'active',
    });

    await Membership.create({
      userId: maliciousUser._id,
      organizationId: maliciousOrg._id,
      role: 'member',
      status: 'active',
    });

    const result = await authenticateUser({
      email: 'malicious-user@example.com',
      password,
      organizationId: maliciousOrg._id.toString(),
      role: 'admin',
      permissions: ['godmode'],
    });

    assert.equal(result.membership.role, 'member');
    assert.equal(result.membership.permissions, undefined);
  });

  test('userAgent is stored when provided', async () => {
    const password = 'StrongPass!123';
    const uaUser = await User.create({
      name: 'UA User',
      email: 'ua-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword(password),
      status: 'active',
    });

    const uaOrg = await Organization.create({
      name: 'UA Org',
      slug: 'ua-org',
      status: 'active',
    });

    await Membership.create({
      userId: uaUser._id,
      organizationId: uaOrg._id,
      role: 'member',
      status: 'active',
    });

    await authenticateUser({
      email: 'ua-user@example.com',
      password,
      organizationId: uaOrg._id.toString(),
      userAgent: 'Workly-Test-Agent/1.0',
      ipAddress: '10.10.10.10',
    });

    const session = await RefreshTokenSession.findOne({ userId: uaUser._id, organizationId: uaOrg._id }).lean();
    assert.equal(session.userAgent, 'Workly-Test-Agent/1.0');
    assert.equal(session.ipAddress, '10.10.10.10');
  });

  test('plaintext refresh token is not present in the session document', async () => {
    const password = 'StrongPass!123';
    const plainUser = await User.create({
      name: 'Plain User',
      email: 'plain-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword(password),
      status: 'active',
    });

    const plainOrg = await Organization.create({
      name: 'Plain Org',
      slug: 'plain-org',
      status: 'active',
    });

    await Membership.create({
      userId: plainUser._id,
      organizationId: plainOrg._id,
      role: 'member',
      status: 'active',
    });

    const result = await authenticateUser({
      email: 'plain-user@example.com',
      password,
      organizationId: plainOrg._id.toString(),
    });

    const session = await RefreshTokenSession.findOne({ userId: plainUser._id, organizationId: plainOrg._id }).select('+tokenHash').lean();
    assert.ok(session.tokenHash);
    assert.notEqual(session.tokenHash, result.refreshToken);
    assert.equal(session.tokenHash.includes(result.refreshToken), false);
  });

  test('each authentication creates a different refresh token/session', async () => {
    const password = 'StrongPass!123';
    const uniqueUser = await User.create({
      name: 'Unique User',
      email: 'unique-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword(password),
      status: 'active',
    });

    const uniqueOrg = await Organization.create({
      name: 'Unique Org',
      slug: 'unique-org',
      status: 'active',
    });

    await Membership.create({
      userId: uniqueUser._id,
      organizationId: uniqueOrg._id,
      role: 'member',
      status: 'active',
    });

    const one = await authenticateUser({
      email: 'unique-user@example.com',
      password,
      organizationId: uniqueOrg._id.toString(),
    });

    const two = await authenticateUser({
      email: 'unique-user@example.com',
      password,
      organizationId: uniqueOrg._id.toString(),
    });

    assert.notEqual(one.refreshToken, two.refreshToken);
    const sessions = await RefreshTokenSession.find({ userId: uniqueUser._id, organizationId: uniqueOrg._id }).lean();
    assert.equal(sessions.length >= 2, true);
  });

  test('authentication errors never contain the supplied password', async () => {
    await assert.rejects(
      authenticateUser({
        email: 'auth-user@example.com',
        password: 'WrongPass!123',
        organizationId: organization._id.toString(),
      }),
      (error) => {
        assert.equal(error.code, AUTH_INVALID_CREDENTIALS);
        assert.equal(error.message.includes('WrongPass!123'), false);
        return true;
      }
    );
  });

  test('authentication errors never contain the refresh token', async () => {
    const password = 'StrongPass!123';
    const noTokenUser = await User.create({
      name: 'No Token User',
      email: 'notoken-user@example.com',
      passwordHash: await require('../src/utils/password').hashPassword(password),
      status: 'active',
    });

    const noTokenOrg = await Organization.create({
      name: 'No Token Org',
      slug: 'no-token-org',
      status: 'active',
    });

    await Membership.create({
      userId: noTokenUser._id,
      organizationId: noTokenOrg._id,
      role: 'member',
      status: 'active',
    });

    await assert.rejects(
      authenticateUser({
        email: 'notoken-user@example.com',
        password: 'WrongPass!123',
        organizationId: noTokenOrg._id.toString(),
      }),
      (error) => {
        assert.equal(error.code, AUTH_INVALID_CREDENTIALS);
        assert.equal(error.message.includes('refresh'), false);
        return true;
      }
    );
  });

  test('authentication errors never contain JWT_SECRET', async () => {
    await assert.rejects(
      authenticateUser({
        email: 'missing@example.com',
        password: 'StrongPass!123',
        organizationId: organization._id.toString(),
      }),
      (error) => {
        assert.equal(error.code, AUTH_INVALID_CREDENTIALS);
        assert.equal(error.message.toLowerCase().includes('jwt_secret'), false);
        assert.equal(error.message.toLowerCase().includes('secret'), false);
        return true;
      }
    );
  });
});
