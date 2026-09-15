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

    return res.json({
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

    return res.json({
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

    return res.json({
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

module.exports = {
  createTeam,
  listTeams,
  getTeam,
  updateTeam,
  deleteTeam,
};