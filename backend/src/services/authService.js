const mongoose = require('mongoose');

const { User, Organization, Membership, RefreshTokenSession } = require('../models');
const { verifyPassword } = require('../utils/password');
const { signAccessToken } = require('../utils/jwt');
const { generateRefreshToken, hashRefreshToken } = require('../utils/refreshToken');

const AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS';
const REFRESH_SESSION_TTL_DAYS = 30;

class AuthenticationError extends Error {
  constructor(code = AUTH_INVALID_CREDENTIALS, message = 'Authentication failed.') {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    throw new AuthenticationError();
  }

  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    throw new AuthenticationError();
  }

  return normalized;
}

function validateAuthInput({ email, password, organizationId }) {
  if (typeof email !== 'string' || typeof password !== 'string' || typeof organizationId !== 'string') {
    throw new AuthenticationError();
  }

  if (!email.trim() || !password.trim() || !organizationId.trim()) {
    throw new AuthenticationError();
  }

  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
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

    const organization = await Organization.findOne({
      _id: organizationId,
      status: 'active',
    });

    if (!organization) {
      throw new AuthenticationError();
    }

    const membership = await Membership.findOne({
      userId: user._id,
      organizationId: organization._id,
      status: 'active',
    });

    if (!membership) {
      throw new AuthenticationError();
    }

    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const sessionData = {
      userId: user._id,
      organizationId: organization._id,
      tokenHash,
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
      },
      membership: {
        id: membership._id,
        role: membership.role,
      },
      accessToken,
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

module.exports = {
  authenticateUser,
  AuthenticationError,
  AUTH_INVALID_CREDENTIALS,
  REFRESH_SESSION_TTL_DAYS,
};
