function validateObject(value, allowedFields) {
  const payload = value && typeof value === 'object' ? value : {};
  const details = [];

  Object.keys(payload).forEach((key) => {
    if (!allowedFields.has(key)) {
      details.push({ path: [key], message: 'Unexpected field.' });
    }
  });

  return { payload, details };
}

const createInvitationSchema = {
  validate(value) {
    const { payload, details } = validateObject(value, new Set(['email', 'role']));
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const role = typeof payload.role === 'string' ? payload.role.trim().toLowerCase() : '';

    if (!email) {
      details.push({ path: ['email'], message: 'Email is required.' });
    } else if (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      details.push({ path: ['email'], message: 'Please provide a valid email address.' });
    }

    if (!role) {
      details.push({ path: ['role'], message: 'Role is required.' });
    } else if (!['manager', 'member'].includes(role)) {
      details.push({ path: ['role'], message: 'Role must be manager or member.' });
    }

    if (role === 'admin') {
      details.push({ path: ['role'], message: 'Admin invitations are not allowed.' });
    }

    if (details.length > 0) {
      return {
        value: payload,
        error: { details },
      };
    }

    return {
      value: {
        email,
        role,
      },
    };
  },
};

const acceptInvitationSchema = {
  validate(value) {
    const { payload, details } = validateObject(value, new Set(['name', 'password']));
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const password = typeof payload.password === 'string' ? payload.password : '';

    if (!name) {
      details.push({ path: ['name'], message: 'Name is required.' });
    } else if (name.length < 2 || name.length > 100) {
      details.push({ path: ['name'], message: 'Name must be between 2 and 100 characters.' });
    }

    if (typeof password !== 'string') {
      details.push({ path: ['password'], message: 'Password is required.' });
    } else if (password.length < 8 || password.length > 128 || password.trim() !== password) {
      details.push({ path: ['password'], message: 'Password must be 8-128 characters and cannot contain leading or trailing spaces.' });
    }

    if (details.length > 0) {
      return {
        value: payload,
        error: { details },
      };
    }

    return {
      value: {
        name,
        password,
      },
    };
  },
};

module.exports = {
  createInvitationSchema,
  acceptInvitationSchema,
};
