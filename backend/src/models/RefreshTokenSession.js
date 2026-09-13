const mongoose = require('mongoose');

const refreshTokenSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
      trim: true,
      minlength: 32,
      maxlength: 255,
    },
    familyId: {
      type: String,
      required: true,
      index: true,
      trim: true,
      minlength: 32,
      maxlength: 64,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
      trim: true,
      maxlength: 512,
    },
    ipAddress: {
      type: String,
      default: null,
      trim: true,
      maxlength: 45,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RefreshTokenSession', refreshTokenSessionSchema);
