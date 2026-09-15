const invitationService = require('../services/invitationService');

async function createInvitation(req, res, next) {
  try {
    const result = await invitationService.createInvitation(req.tenant.organizationId, {
      email: req.body.email,
      role: req.body.role,
      invitedBy: req.user.userId,
    });

    return res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function listInvitations(req, res, next) {
  try {
    const result = await invitationService.listInvitations(
      req.tenant.organizationId,
      req.query.page,
      req.query.limit,
      req.query.status
    );

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function revokeInvitation(req, res, next) {
  try {
    const result = await invitationService.revokeInvitation(req.tenant.organizationId, req.params.invitationId);

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function acceptInvitation(req, res, next) {
  try {
    const result = await invitationService.acceptInvitation(req.params.token, req.body);

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createInvitation,
  listInvitations,
  revokeInvitation,
  acceptInvitation,
};
