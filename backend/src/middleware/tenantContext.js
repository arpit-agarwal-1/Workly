const mongoose = require('mongoose');

const { User, Membership, Organization } = require('../models');
const { ROLE_PERMISSIONS } = require('../config/permissions');

const ORGANIZATION_HEADER = 'x-organization-id';

function tenantContextError() {
  return {
    statusCode: 403,
    code: 'TENANT_CONTEXT_REQUIRED',
    message: 'Tenant context is required.',
  };
}

async function tenantContext(req, res, next) {
  if (!req.user || typeof req.user.userId !== 'string') {
    return next({
      statusCode: 401,
      code: 'AUTH_REQUIRED',
      message: 'Authentication is required to access this resource.',
    });
  }

  const organizationId = req.get(ORGANIZATION_HEADER);
  if (typeof organizationId !== 'string' || !mongoose.Types.ObjectId.isValid(organizationId)) {
    return next(tenantContextError());
  }

  try {
    const user = await User.findOne({ _id: req.user.userId, status: 'active' }).lean();
    const membership = await Membership.findOne({
      userId: req.user.userId,
      organizationId,
      status: 'active',
    }).lean();

    if (!user || !membership) {
      return next(tenantContextError());
    }

    const organization = await Organization.findOne({
      _id: membership.organizationId,
      status: 'active',
    }).lean();

    if (!organization) {
      return next(tenantContextError());
    }

    req.tenant = {
      userId: user._id.toString(),
      organizationId: organization._id.toString(),
      membershipId: membership._id.toString(),
      role: membership.role,
      permissions: [...(ROLE_PERMISSIONS[membership.role] || [])],
    };

    return next();
  } catch (error) {
    return next(tenantContextError());
  }
}

module.exports = tenantContext;
module.exports.ORGANIZATION_HEADER = ORGANIZATION_HEADER;