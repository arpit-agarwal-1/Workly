const mongoose = require('mongoose');
const { Team } = require('../models');

function teamError() {
  return {
    statusCode: 404,
    code: 'TEAM_NOT_FOUND',
    message: 'Team not found.',
  };
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

async function createTeam(organizationId, data) {
  return Team.create({
    organizationId,
    name: data.name,
    description: data.description,
  });
}

async function listTeams(organizationId, page, limit) {
  const pagination = parsePagination(page, limit);
  const filter = { organizationId };

  const [items, total] = await Promise.all([
    Team.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),

    Team.countDocuments(filter),
  ]);

  return {
    items,
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

async function getTeam(organizationId, teamId) {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    throw teamError();
  }

  const team = await Team.findOne({
    _id: teamId,
    organizationId,
  }).lean();

  if (!team) {
    throw teamError();
  }

  return team;
}

async function updateTeam(organizationId, teamId, data) {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    throw teamError();
  }

  const team = await Team.findOneAndUpdate(
    {
      _id: teamId,
      organizationId,
    },
    {
      $set: data,
    },
    {
      returnDocument: 'after',
      runValidators: true,
    }
  ).lean();

  if (!team) {
    throw teamError();
  }

  return team;
}

async function deleteTeam(organizationId, teamId) {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    throw teamError();
  }

  const team = await Team.findOneAndDelete({
    _id: teamId,
    organizationId,
  }).lean();

  if (!team) {
    throw teamError();
  }
}

module.exports = {
  createTeam,
  listTeams,
  getTeam,
  updateTeam,
  deleteTeam,
};