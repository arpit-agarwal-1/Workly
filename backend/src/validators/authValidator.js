const signupSchema = {
  validate(value) {
    const payload = value && typeof value === 'object' ? value : {};
    const details = [];
    const allowedFields = new Set(['name', 'email', 'password', 'organizationName']);

    Object.keys(payload).forEach((key) => {
      if (!allowedFields.has(key)) {
        details.push({ path: [key], message: 'Unexpected field.' });
      }
    });

    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name) {
      details.push({ path: ['name'], message: 'Name is required.' });
    } else if (name.length < 2 || name.length > 100) {
      details.push({ path: ['name'], message: 'Name must be between 2 and 100 characters.' });
    }

    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    if (!email) {
      details.push({ path: ['email'], message: 'Email is required.' });
    } else if (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      details.push({ path: ['email'], message: 'Please provide a valid email address.' });
    }

    const password = typeof payload.password === 'string' ? payload.password : '';
    if (!password) {
      details.push({ path: ['password'], message: 'Password is required.' });
    } else if (password.trim().length < 8 || password.trim().length > 128 || password.trim() !== password) {
      details.push({ path: ['password'], message: 'Password must be 8-128 characters and contain no leading or trailing spaces.' });
    }

    const organizationName = typeof payload.organizationName === 'string' ? payload.organizationName.trim() : '';
    if (!organizationName) {
      details.push({ path: ['organizationName'], message: 'Organization name is required.' });
    } else if (organizationName.length < 2 || organizationName.length > 120) {
      details.push({ path: ['organizationName'], message: 'Organization name must be between 2 and 120 characters.' });
    }

    if (details.length > 0) {
      return {
        value: payload,
        error: {
          details,
        },
      };
    }

    return {
      value: {
        name,
        email,
        password,
        organizationName,
      },
    };
  },
};

module.exports = {
  signupSchema,
};
