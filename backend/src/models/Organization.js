const mongoose = require('mongoose');

const slugValidator = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 80,
      validate: {
        validator(value) {
          return slugValidator.test(value);
        },
        message: 'Slug must contain only lowercase letters, numbers, and hyphens.',
      },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Organization', organizationSchema);
