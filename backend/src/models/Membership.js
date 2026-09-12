const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'member'],
      required: true,
      default: 'member',
    },
    status: {
      type: String,
      enum: ['active', 'invited', 'removed'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

membershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
membershipSchema.index({ organizationId: 1, userId: 1 });
membershipSchema.index({ organizationId: 1, role: 1 });

module.exports = mongoose.model('Membership', membershipSchema);
