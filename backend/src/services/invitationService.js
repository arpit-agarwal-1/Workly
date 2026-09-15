const mongoose = require('mongoose');
const { Membership, Organization, OrganizationInvitation, User } = require('../models');
const { hashPassword } = require('../utils/password');
const {
  buildInvitationLink,
  generateInvitationToken,
  getInvitationExpiresAt,
  hashInvitationToken,
} = require('../utils/invitationToken');

function invitationError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    throw invitationError(400, 'VALIDATION_ERROR', 'Email is required.');
  }

  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    throw invitationError(400, 'VALIDATION_ERROR', 'Email is required.');
  }

  if (normalized.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw invitationError(400, 'VALIDATION_ERROR', 'Please provide a valid email address.');
  }

  return normalized;
}

function parsePagination(page, limit) {
  const parsedPage = Number(page || 1);
  const parsedLimit = Number(limit || 20);

  if (
    !Number.isInteger(parsedPage) ||
    parsedPage < 1 ||
    !Number.isInteger(parsedLimit) ||
    parsedLimit < 1 ||
    parsedLimit > 100
  ) {
    const error = new Error('Invalid pagination parameters.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
}

function safeInvitation(invitation) {
  return {
    id: invitation._id,
    organizationId: invitation.organizationId ? invitation.organizationId.toString() : null,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    invitedBy: invitation.invitedBy ? invitation.invitedBy.toString() : null,
    acceptedAt: invitation.acceptedAt || null,
    revokedAt: invitation.revokedAt || null,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
  };
}

function normalizeInvitationRole(role) {
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : '';

  if (!['manager', 'member'].includes(normalized)) {
    throw invitationError(400, 'VALIDATION_ERROR', 'Role must be manager or member.');
  }

  if (normalized === 'admin') {
    throw invitationError(400, 'VALIDATION_ERROR', 'Admin invitations are not allowed.');
  }

  return normalized;
}

function validateMembershipName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';

  if (trimmed.length < 2 || trimmed.length > 100) {
    throw invitationError(400, 'VALIDATION_ERROR', 'Name must be between 2 and 100 characters.');
  }

  return trimmed;
}

function validatePassword(password) {
  if (typeof password !== 'string') {
    throw invitationError(400, 'VALIDATION_ERROR', 'Password is required.');
  }

  if (password.length < 8 || password.length > 128 || password.trim() !== password) {
    throw invitationError(
      400,
      'VALIDATION_ERROR',
      'Password must be 8-128 characters and cannot contain leading or trailing spaces.'
    );
  }

  return password;
}

async function createInvitation(organizationId, data = {}) {
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    throw invitationError(400, 'VALIDATION_ERROR', 'Invalid organization id.');
  }

  const email = normalizeEmail(data.email);
  const role = normalizeInvitationRole(data.role);
  const invitedBy = data.invitedBy;

  const organization = await Organization.findOne({ _id: organizationId, status: 'active' }).lean();
  if (!organization) {
    throw invitationError(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found.');
  }

  const existingInvitation = await OrganizationInvitation.findOne({
    organizationId,
    email,
    status: 'pending',
  }).lean();

  if (existingInvitation) {
    throw invitationError(409, 'INVITATION_ALREADY_EXISTS', 'A pending invitation already exists for this email.');
  }

  const rawToken = generateInvitationToken();
  const expiresAt = getInvitationExpiresAt();

  const invitation = await OrganizationInvitation.create({
    organizationId,
    email,
    role,
    tokenHash: hashInvitationToken(rawToken),
    status: 'pending',
    expiresAt,
    invitedBy: invitedBy && mongoose.Types.ObjectId.isValid(invitedBy) ? invitedBy : null,
  });

  return {
    ...safeInvitation(invitation.toObject ? invitation.toObject() : invitation),
    invitationToken: rawToken,
    invitationLink: buildInvitationLink(rawToken),
  };
}

async function listInvitations(organizationId, page, limit, status) {
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    throw invitationError(400, 'VALIDATION_ERROR', 'Invalid organization id.');
  }

  const pagination = parsePagination(page, limit);
  const filter = { organizationId };

  if (typeof status === 'string' && status.trim()) {
    const normalizedStatus = status.trim().toLowerCase();
    if (!['pending', 'accepted', 'revoked', 'expired'].includes(normalizedStatus)) {
      throw invitationError(400, 'VALIDATION_ERROR', 'Invalid invitation status.');
    }
    filter.status = normalizedStatus;
  }

  const [items, total] = await Promise.all([
    OrganizationInvitation.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    OrganizationInvitation.countDocuments(filter),
  ]);

  return {
    items: items.map(safeInvitation),
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

async function revokeInvitation(organizationId, invitationId) {
  if (!mongoose.Types.ObjectId.isValid(organizationId) || !mongoose.Types.ObjectId.isValid(invitationId)) {
    throw invitationError(400, 'VALIDATION_ERROR', 'Invalid invitation id.');
  }

  const invitation = await OrganizationInvitation.findOne({
    _id: invitationId,
    organizationId,
  }).lean();

  if (!invitation) {
    throw invitationError(404, 'INVITATION_NOT_FOUND', 'Invitation not found.');
  }

  if (invitation.status === 'accepted') {
    throw invitationError(409, 'INVITATION_ALREADY_ACCEPTED', 'Accepted invitations cannot be revoked.');
  }

  if (invitation.status === 'revoked') {
    throw invitationError(409, 'INVITATION_ALREADY_REVOKED', 'Invitation is already revoked.');
  }

  if (invitation.status === 'expired') {
    throw invitationError(409, 'INVITATION_EXPIRED', 'Invitation is already expired.');
  }

  const updatedInvitation = await OrganizationInvitation.findOneAndUpdate(
    { _id: invitationId, organizationId, status: 'pending' },
    { $set: { status: 'revoked', revokedAt: new Date() } },
    { returnDocument: 'after', runValidators: true }
  ).lean();

  if (!updatedInvitation) {
    throw invitationError(409, 'INVITATION_ALREADY_REVOKED', 'Invitation is already revoked.');
  }

  return {
    message: 'Invitation revoked.',
    invitation: safeInvitation(updatedInvitation),
  };
}

async function acceptInvitation(rawToken, data = {}) {
  const token = typeof rawToken === 'string' ? rawToken.trim() : '';

  if (!token) {
    throw invitationError(400, 'VALIDATION_ERROR', 'Invitation token is required.');
  }

  const tokenHash = hashInvitationToken(token);
  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      const invitation = await OrganizationInvitation.findOne({ tokenHash }).session(session).lean();

      if (!invitation) {
        throw invitationError(404, 'INVITATION_NOT_FOUND', 'Invitation not found or invalid.');
      }

      if (invitation.status === 'accepted') {
        throw invitationError(409, 'INVITATION_ALREADY_ACCEPTED', 'This invitation has already been accepted.');
      }

      if (invitation.status === 'revoked') {
        throw invitationError(409, 'INVITATION_REVOKED', 'This invitation has been revoked.');
      }

      if (invitation.status === 'expired' || invitation.expiresAt <= new Date()) {
        await OrganizationInvitation.findOneAndUpdate(
          { _id: invitation._id, status: { $in: ['pending'] } },
          { $set: { status: 'expired' } },
          { session }
        );

        throw invitationError(410, 'INVITATION_EXPIRED', 'This invitation has expired.');
      }

      const normalizedEmail = invitation.email;
      const name = validateMembershipName(data.name);
      const password = validatePassword(data.password);

      const existingUser = await User.findOne({ email: normalizedEmail }).session(session);
      let user = existingUser;

      if (!user) {
        const passwordHash = await hashPassword(password);
        const created = await User.create(
          [
            {
              name,
              email: normalizedEmail,
              passwordHash,
              status: 'active',
            },
          ],
          { session }
        );

        user = created[0];
      }

      if (user.status !== 'active') {
        throw invitationError(403, 'USER_ACCOUNT_INACTIVE', 'User account is not active.');
      }

      const activeMembership = await Membership.findOne({
        userId: user._id,
        status: 'active',
      }).session(session).lean();

      if (activeMembership) {
        if (activeMembership.organizationId.toString() === invitation.organizationId.toString()) {
          throw invitationError(409, 'USER_ALREADY_IN_ORGANIZATION', 'User already belongs to this organization.');
        }

        throw invitationError(409, 'USER_ALREADY_IN_ORGANIZATION', 'User already belongs to another organization.');
      }

      let membership;
      try {
        const createdMembership = await Membership.create(
          [
            {
              userId: user._id,
              organizationId: invitation.organizationId,
              role: invitation.role,
              status: 'active',
            },
          ],
          { session }
        );

        membership = createdMembership[0];
      } catch (error) {
        if (error && error.name === 'MongoServerError' && error.code === 11000) {
          throw invitationError(409, 'USER_ALREADY_IN_ORGANIZATION', 'User already belongs to this organization.');
        }
        throw error;
      }

      const updatedInvitation = await OrganizationInvitation.findOneAndUpdate(
        { _id: invitation._id },
        {
          $set: {
            status: 'accepted',
            acceptedAt: new Date(),
          },
        },
        { session, returnDocument: 'after', runValidators: true }
      ).lean();

      result = {
        message: 'Invitation accepted.',
        invitation: {
          id: updatedInvitation._id,
          status: updatedInvitation.status,
          acceptedAt: updatedInvitation.acceptedAt,
        },
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          status: user.status,
        },
        membership: {
          id: membership._id,
          organizationId: membership.organizationId.toString(),
          role: membership.role,
          status: membership.status,
        },
      };
    });

    return result;
  } catch (error) {
    if (error && error.statusCode) {
      throw error;
    }

    throw invitationError(500, 'SERVER_ERROR', 'Unable to accept invitation.');
  } finally {
    await session.endSession();
  }
}

module.exports = {
  createInvitation,
  listInvitations,
  revokeInvitation,
  acceptInvitation,
};
