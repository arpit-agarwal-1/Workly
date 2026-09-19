const teamService = require('../services/teamService');

async function createTeam(req, res, next) {
  try {
    const team = await teamService.createTeam(
      req.tenant.organizationId,
      req.body
    );

    return res.status(201).json({
      status: 'success',
      data: team,
    });
  } catch (error) {
    return next(error);
  }
}

async function listTeams(req, res, next) {
  try {
    const result = await teamService.listTeams(
      req.tenant.organizationId,
      req.query.page,
      req.query.limit
    );

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function getTeam(req, res, next) {
  try {
    const team = await teamService.getTeam(
      req.tenant.organizationId,
      req.params.teamId
    );

    return res.status(200).json({
      status: 'success',
      data: team,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateTeam(req, res, next) {
  try {
    const team = await teamService.updateTeam(
      req.tenant.organizationId,
      req.params.teamId,
      req.body
    );

    return res.status(200).json({
      status: 'success',
      data: team,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteTeam(req, res, next) {
  try {
    await teamService.deleteTeam(
      req.tenant.organizationId,
      req.params.teamId
    );

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function addTeamMember(req, res, next) {
  try {
    const teamMember = await teamService.addTeamMember(
      req.tenant.organizationId,
      req.params.teamId,
      req.body.membershipId
    );

    return res.status(201).json({
      status: 'success',
      data: teamMember,
    });
  } catch (error) {
    return next(error);
  }
}

async function listTeamMembers(req, res, next) {
  try {
    const result = await teamService.listTeamMembers(
      req.tenant.organizationId,
      req.params.teamId,
      req.query.page,
      req.query.limit
    );

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function removeTeamMember(req, res, next) {
  try {
    await teamService.removeTeamMember(
      req.tenant.organizationId,
      req.params.teamId,
      req.params.membershipId
    );

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
 createTeam,
  listTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  listTeamMembers,
  removeTeamMember,
};