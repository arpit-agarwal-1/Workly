const mongoose = require('mongoose');

const {
  Team,
  TeamMembership,
  Membership,
} = require('../models');

function teamError() {
  const error = new Error('Team not found.');
  error.statusCode = 404;
  error.code = 'TEAM_NOT_FOUND';

  return error;
}

function duplicateTeamError() {
  const error = new Error(
    'A team with this name already exists.'
  );
  error.statusCode = 409;
  error.code = 'TEAM_ALREADY_EXISTS';

  return error;
}

function teamMemberError() {
  const error = new Error('Team member not found.');
  error.statusCode = 404;
  error.code = 'TEAM_MEMBER_NOT_FOUND';

  return error;
}

function memberNotActiveError() {
  const error = new Error(
    'Only active organization members can be added to a team.'
  );
  error.statusCode = 400;
  error.code = 'MEMBER_NOT_ACTIVE';

  return error;
}

function alreadyTeamMemberError() {
  const error = new Error(
    'User is already a member of this team.'
  );
  error.statusCode = 409;
  error.code = 'ALREADY_TEAM_MEMBER';

  return error;
}

function invalidPaginationError() {
  const error = new Error(
    'Invalid pagination parameters.'
  );
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';

  return error;
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
    throw invalidPaginationError();
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
}

async function createTeam(organizationId, data) {
  try {
    return await Team.create({
      organizationId,
      name: data.name,
      description: data.description,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw duplicateTeamError();
    }

    throw error;
  }
}

async function listTeams(organizationId, page, limit) {
  const pagination = parsePagination(page, limit);

  const filter = {
    organizationId,
  };

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
    totalPages: Math.ceil(
      total / pagination.limit
    ),
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

async function updateTeam(
  organizationId,
  teamId,
  data
) {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    throw teamError();
  }

  try {
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
  } catch (error) {
    if (error?.code === 11000) {
      throw duplicateTeamError();
    }

    throw error;
  }
}

async function deleteTeam(
  organizationId,
  teamId
) {
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

  await TeamMembership.deleteMany({
    organizationId,
    teamId,
  });
}

async function addTeamMember(
  organizationId,
  teamId,
  membershipId
) {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    throw teamError();
  }

  if (!mongoose.Types.ObjectId.isValid(membershipId)) {
    const error = new Error(
      'Invalid membership ID.'
    );
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';

    throw error;
  }

  const team = await Team.findOne({
    _id: teamId,
    organizationId,
  }).lean();

  if (!team) {
    throw teamError();
  }

  const organizationMember =
    await Membership.findOne({
      _id: membershipId,
      organizationId,
      status: 'active',
    }).lean();

  if (!organizationMember) {
    throw memberNotActiveError();
  }

  const existingMembership =
    await TeamMembership.findOne({
      userId: organizationMember.userId,
      teamId,
    }).lean();

  if (existingMembership?.status === 'active') {
    throw alreadyTeamMemberError();
  }

  if (existingMembership?.status === 'removed') {
    const restoredMembership =
      await TeamMembership.findOneAndUpdate(
        {
          _id: existingMembership._id,
          organizationId,
          teamId,
        },
        {
          $set: {
            status: 'active',
          },
        },
        {
          returnDocument: 'after',
          runValidators: true,
        }
      ).lean();

    return restoredMembership;
  }

  try {
    return await TeamMembership.create({
      userId: organizationMember.userId,
      teamId,
      organizationId,
      status: 'active',
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw alreadyTeamMemberError();
    }

    throw error;
  }
}

async function listTeamMembers(
  organizationId,
  teamId,
  page,
  limit
) {
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

  const pagination = parsePagination(
    page,
    limit
  );

  const filter = {
    organizationId,
    teamId,
    status: 'active',
  };

  const [members, total] = await Promise.all([
    TeamMembership.find(filter)
      .populate({
        path: 'userId',
        select: 'name email status',
      })
      .sort({ createdAt: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),

    TeamMembership.countDocuments(filter),
  ]);

  const items = members
    .filter((member) => member.userId)
    .map((member) => ({
      id: member._id,
      user: {
        id: member.userId._id,
        name: member.userId.name,
        email: member.userId.email,
        status: member.userId.status,
      },
      status: member.status,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    }));

  return {
    items,
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.ceil(
      total / pagination.limit
    ),
  };
}

async function removeTeamMember(
  organizationId,
  teamId,
  membershipId
) {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    throw teamError();
  }

  if (!mongoose.Types.ObjectId.isValid(membershipId)) {
    throw teamMemberError();
  }

  const team = await Team.findOne({
    _id: teamId,
    organizationId,
  }).lean();

  if (!team) {
    throw teamError();
  }

  const teamMembership =
    await TeamMembership.findOneAndUpdate(
      {
        _id: membershipId,
        organizationId,
        teamId,
        status: 'active',
      },
      {
        $set: {
          status: 'removed',
        },
      },
      {
        returnDocument: 'after',
        runValidators: true,
      }
    ).lean();

  if (!teamMembership) {
    throw teamMemberError();
  }

  return teamMembership;
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