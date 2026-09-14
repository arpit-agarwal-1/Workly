const { getCurrentOrganization, updateCurrentOrganization } = require('../services/organizationService');

async function getOrganization(req, res, next) {
  try {
    const organization = await getCurrentOrganization(req.tenant.organizationId);
    return res.status(200).json({ status: 'success', data: organization });
  } catch (error) { return next(error); }
}

async function updateOrganization(req, res, next) {
  try {
    const organization = await updateCurrentOrganization(req.tenant.organizationId, req.body);
    return res.status(200).json({ status: 'success', data: organization });
  } catch (error) { return next(error); }
}

module.exports = { getOrganization, updateOrganization };
