const mongoose = require('mongoose');

const teamMembershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },

    status: {
      type: String,
      enum: ['active', 'removed'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

teamMembershipSchema.index(
  { userId: 1, teamId: 1 },
  { unique: true }
);

teamMembershipSchema.index({
  organizationId: 1,
  teamId: 1,
  userId: 1,
});

teamMembershipSchema.index({
  organizationId: 1,
  userId: 1,
});

const TeamMembership = mongoose.model(
  'TeamMembership',
  teamMembershipSchema
);

module.exports = TeamMembership;