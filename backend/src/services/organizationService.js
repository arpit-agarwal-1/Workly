const { Organization } = require('../models');

function organizationError() {
  return { statusCode: 404, code: 'ORGANIZATION_NOT_FOUND', message: 'Organization not found.' };
}

async function getCurrentOrganization(organizationId) {
  const organization = await Organization.findOne({ _id: organizationId, status: { $in: ['active', 'inactive', 'suspended'] } }).lean();
  if (!organization) throw organizationError();
  return organization;
}

async function updateCurrentOrganization(organizationId, updates) {
  const organization = await Organization.findOneAndUpdate(
    { _id: organizationId },
    { $set: { name: updates.name } },
    { returnDocument: 'after', runValidators: true }
  ).lean();
  if (!organization) throw organizationError();
  return organization;
}

module.exports = { getCurrentOrganization, updateCurrentOrganization };
