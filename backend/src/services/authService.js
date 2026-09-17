const mongoose = require('mongoose');

const { User, Organization, Membership, RefreshTokenSession } = require('../models');
const { verifyPassword, hashPassword } = require('../utils/password');
const { signAccessToken } = require('../utils/jwt');
const { ACCESS_TOKEN_TTL_SECONDS } = require('../config/jwt');
const {
  generateRefreshToken,
  generateRefreshTokenFamilyId,
  hashRefreshToken,
} = require('../utils/refreshToken');

const AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS';
const AUTH_EMAIL_ALREADY_EXISTS = 'AUTH_EMAIL_ALREADY_EXISTS';
const VALIDATION_ERROR = 'VALIDATION_ERROR';
const SIGNUP_ERROR = 'SIGNUP_ERROR';
const REFRESH_SESSION_TTL_DAYS = 30;

const signupTestHooks = {
  beforeRefreshTokenSessionCreate: null,
};

function setSignupTestHooks(hooks = {}) {
  Object.assign(signupTestHooks, hooks);
}

function clearSignupTestHooks() {
  signupTestHooks.beforeRefreshTokenSessionCreate = null;
}

class AuthenticationError extends Error {
  constructor(code = AUTH_INVALID_CREDENTIALS, message = 'Authentication failed.') {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
    this.statusCode = 401;
  }
}

class SignupError extends Error {
  constructor(code = SIGNUP_ERROR, message = 'Signup failed.', statusCode = 500) {
    super(message);
    this.name = 'SignupError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    throw new SignupError(VALIDATION_ERROR, 'Email is required.', 400);
  }

  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    throw new SignupError(VALIDATION_ERROR, 'Email is required.', 400);
  }

  if (normalized.length > 160) {
    throw new SignupError(VALIDATION_ERROR, 'Email must be 160 characters or fewer.', 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new SignupError(VALIDATION_ERROR, 'Please provide a valid email address.', 400);
  }

  return normalized;
}

function buildOrganizationSlug(name) {
  const slug = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 80);

  if (!slug || slug.length < 2) {
    throw new SignupError(VALIDATION_ERROR, 'Organization name must be at least 2 characters.', 400);
  }

  return slug;
}

function normalizeSignupInput({ name, email, password, organizationName }) {
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    throw new SignupError(VALIDATION_ERROR, 'Name must be between 2 and 100 characters.', 400);
  }

  const normalizedEmail = normalizeEmail(email);

  if (typeof password !== 'string') {
    throw new SignupError(VALIDATION_ERROR, 'Password is required.', 400);
  }

  if (password.length < 8 || password.length > 128 || password.trim() !== password) {
    throw new SignupError(
      VALIDATION_ERROR,
      'Password must be 8-128 characters and cannot contain leading or trailing spaces.',
      400
    );
  }

  const trimmedOrganizationName = typeof organizationName === 'string' ? organizationName.trim() : '';
  if (trimmedOrganizationName.length < 2 || trimmedOrganizationName.length > 120) {
    throw new SignupError(
      VALIDATION_ERROR,
      'Organization name must be between 2 and 120 characters.',
      400
    );
  }

  return {
    name: trimmedName,
    email: normalizedEmail,
    password,
    organizationName: trimmedOrganizationName,
  };
}

function isMongoTransactionUnavailableError(error) {
  return Boolean(
    error &&
    error.name === 'MongoServerError' &&
    (error.code === 20 || /Transaction numbers are only allowed on a replica set member or mongos/i.test(error.message || ''))
  );
}

function isDuplicateKeyError(error, field) {
  if (!error || error.name !== 'MongoServerError' || error.code !== 11000) {
    return false;
  }

  const keyPattern = error.keyPattern || {};
  return Boolean(field ? keyPattern[field] : Object.keys(keyPattern).length > 0);
}

async function signupUser({
  name,
  email,
  password,
  organizationName,
  userAgent,
  ipAddress,
} = {}) {
  const normalized = normalizeSignupInput({ name, email, password, organizationName });
  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      const existingUser = await User.findOne({ email: normalized.email }).session(session).lean();
      if (existingUser) {
        const error = new SignupError(AUTH_EMAIL_ALREADY_EXISTS, 'Email already exists.', 409);
        throw error;
      }

      const slug = buildOrganizationSlug(normalized.organizationName);
      const existingOrganization = await Organization.findOne({ slug }).session(session).lean();
      if (existingOrganization) {
        throw new SignupError('AUTH_ORGANIZATION_NAME_UNAVAILABLE', 'Organization name is unavailable.', 409);
      }

      const passwordHash = await hashPassword(normalized.password);
      const user = await User.create(
        [
          {
            name: normalized.name,
            email: normalized.email,
            passwordHash,
            status: 'active',
          },
        ],
        { session }
      );

      const organization = await Organization.create(
        [
          {
            name: normalized.organizationName,
            slug,
            status: 'active',
          },
        ],
        { session }
      );

      const membership = await Membership.create(
        [
          {
            userId: user[0]._id,
            organizationId: organization[0]._id,
            role: 'admin',
            status: 'active',
          },
        ],
        { session }
      );

      if (signupTestHooks.beforeRefreshTokenSessionCreate) {
        await signupTestHooks.beforeRefreshTokenSessionCreate({
          userId: user[0]._id,
          organizationId: organization[0]._id,
          membershipId: membership[0]._id,
        });
      }

      const refreshToken = generateRefreshToken();
      const refreshTokenHash = hashRefreshToken(refreshToken);
      const familyId = generateRefreshTokenFamilyId();
      const expiresAt = new Date(Date.now() + REFRESH_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

      const refreshSession = await RefreshTokenSession.create(
        [
          {
            userId: user[0]._id,
            organizationId: organization[0]._id,
            tokenHash: refreshTokenHash,
            familyId,
            expiresAt,
            revokedAt: null,
            lastUsedAt: null,
            ...(typeof userAgent === 'string' && userAgent.trim() ? { userAgent: userAgent.trim().slice(0, 512) } : {}),
            ...(typeof ipAddress === 'string' && ipAddress.trim() ? { ipAddress: ipAddress.trim().slice(0, 45) } : {}),
          },
        ],
        { session }
      );

      const accessToken = signAccessToken({
        userId: user[0]._id.toString(),
        sessionId: refreshSession[0]._id.toString(),
      });

      result = {
        user: {
          id: user[0]._id,
          name: user[0].name,
          email: user[0].email,
          status: user[0].status,
        },
        organization: {
          id: organization[0]._id,
          name: organization[0].name,
          slug: organization[0].slug,
          status: organization[0].status,
        },
        membership: {
          id: membership[0]._id,
          role: membership[0].role,
          status: membership[0].status,
        },
        accessToken,
        refreshToken,
      };
    });

    return result;
  } catch (error) {
    if (error instanceof SignupError) {
      throw error;
    }

    if (isDuplicateKeyError(error, 'email')) {
      throw new SignupError(AUTH_EMAIL_ALREADY_EXISTS, 'Email already exists.', 409);
    }

    if (isDuplicateKeyError(error, 'slug')) {
      throw new SignupError('AUTH_ORGANIZATION_NAME_UNAVAILABLE', 'Organization name is unavailable.', 409);
    }

    if (isMongoTransactionUnavailableError(error)) {
      throw new SignupError(SIGNUP_ERROR, 'Signup infrastructure unavailable.', 503);
    }

    throw new SignupError(SIGNUP_ERROR, 'Unable to create account.', 500);
  } finally {
    await session.endSession();
  }
}

function validateAuthInput({ email, password, organizationId }) {
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new AuthenticationError();
  }

  if (!email.trim() || !password.trim()) {
    throw new AuthenticationError();
  }

  if (organizationId !== undefined && (!mongoose.Types.ObjectId.isValid(organizationId) || !organizationId.trim())) {
    throw new AuthenticationError();
  }
}

async function authenticateUser({
  email,
  password,
  organizationId,
  userAgent,
  ipAddress,
} = {}) {
  try {
    validateAuthInput({ email, password, organizationId });

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user) {
      throw new AuthenticationError();
    }

    if (user.status !== 'active') {
      throw new AuthenticationError();
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      throw new AuthenticationError();
    }

    const membershipQuery = { userId: user._id, status: 'active' };
    if (organizationId !== undefined) {
      membershipQuery.organizationId = organizationId;
    }

    const membership = await Membership.findOne(membershipQuery).sort({ createdAt: 1 });

    if (!membership) {
      throw new AuthenticationError();
    }

    const organization = await Organization.findOne({
      _id: membership.organizationId,
      status: 'active',
    });

    if (!organization) {
      throw new AuthenticationError();
    }

    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);
    const familyId = generateRefreshTokenFamilyId();
    const expiresAt = new Date(Date.now() + REFRESH_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const sessionData = {
      userId: user._id,
      organizationId: organization._id,
      tokenHash,
      familyId,
      expiresAt,
      revokedAt: null,
      lastUsedAt: null,
    };

    if (typeof userAgent === 'string' && userAgent.trim().length > 0) {
      sessionData.userAgent = userAgent.trim().slice(0, 512);
    }

    if (typeof ipAddress === 'string' && ipAddress.trim().length > 0) {
      sessionData.ipAddress = ipAddress.trim().slice(0, 45);
    }

    const session = await RefreshTokenSession.create(sessionData);
    const accessToken = signAccessToken({
      userId: user._id.toString(),
      sessionId: session._id.toString(),
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        status: organization.status,
      },
      membership: {
        id: membership._id,
        role: membership.role,
        status: membership.status,
      },
      accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshToken,
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    if (error && error.name === 'Error' && /password|hash|token/i.test(error.message || '')) {
      throw new AuthenticationError();
    }

    throw new AuthenticationError();
  }
}

async function refreshUser({ refreshToken, userAgent, ipAddress } = {}) {
  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    throw new AuthenticationError();
  }

  const tokenHash = hashRefreshToken(refreshToken);
  const existingSession = await RefreshTokenSession.findOne({ tokenHash })
    .select('+tokenHash')
    .lean();

  if (!existingSession) {
    throw new AuthenticationError();
  }

  if (existingSession.revokedAt) {
    if (existingSession.familyId) {
      await RefreshTokenSession.updateMany(
        { familyId: existingSession.familyId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }
    throw new AuthenticationError();
  }

  if (existingSession.expiresAt <= new Date()) {
    throw new AuthenticationError();
  }

  const session = await mongoose.startSession();
  let result;
  let rotationConflict = false;

  try {
    await session.withTransaction(async () => {
      const claimedSession = await RefreshTokenSession.findOneAndUpdate(
        { _id: existingSession._id, revokedAt: null },
        { $set: { revokedAt: new Date(), lastUsedAt: new Date() } },
        { returnDocument: 'after', session }
      ).lean();

      if (!claimedSession) {
        rotationConflict = true;
        throw new AuthenticationError();
      }

      const user = await User.findById(existingSession.userId).session(session).lean();
      const organization = await Organization.findOne({
        _id: existingSession.organizationId,
        status: 'active',
      }).session(session).lean();
      const membership = await Membership.findOne({
        userId: existingSession.userId,
        organizationId: existingSession.organizationId,
        status: 'active',
      }).session(session).lean();

      if (!user || user.status !== 'active' || !organization || !membership) {
        throw new AuthenticationError();
      }

      const replacementRefreshToken = generateRefreshToken();
      const replacementSession = await RefreshTokenSession.create(
        [
          {
            userId: user._id,
            organizationId: organization._id,
            tokenHash: hashRefreshToken(replacementRefreshToken),
            familyId: existingSession.familyId,
            expiresAt: new Date(Date.now() + REFRESH_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
            revokedAt: null,
            lastUsedAt: null,
            ...(typeof userAgent === 'string' && userAgent.trim() ? { userAgent: userAgent.trim().slice(0, 512) } : {}),
            ...(typeof ipAddress === 'string' && ipAddress.trim() ? { ipAddress: ipAddress.trim().slice(0, 45) } : {}),
          },
        ],
        { session }
      );

      result = {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          status: user.status,
        },
        organization: {
          id: organization._id,
          name: organization.name,
          slug: organization.slug,
          status: organization.status,
        },
        membership: {
          id: membership._id,
          role: membership.role,
          status: membership.status,
        },
        accessToken: signAccessToken({
          userId: user._id.toString(),
          sessionId: replacementSession[0]._id.toString(),
        }),
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        refreshToken: replacementRefreshToken,
      };
    });

    return result;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      if (rotationConflict && existingSession.familyId) {
        await RefreshTokenSession.updateMany(
          { familyId: existingSession.familyId, revokedAt: null },
          { $set: { revokedAt: new Date() } }
        );
      }
      throw error;
    }

    throw new AuthenticationError();
  } finally {
    await session.endSession();
  }
}

async function logoutUser(refreshToken) {
  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    return;
  }

  const tokenHash = hashRefreshToken(refreshToken);
  await RefreshTokenSession.updateOne(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

module.exports = {
  authenticateUser,
  refreshUser,
  logoutUser,
  signupUser,
  AuthenticationError,
  SignupError,
  AUTH_INVALID_CREDENTIALS,
  AUTH_EMAIL_ALREADY_EXISTS,
  VALIDATION_ERROR,
  SIGNUP_ERROR,
  REFRESH_SESSION_TTL_DAYS,
  setSignupTestHooks,
  clearSignupTestHooks,
};
