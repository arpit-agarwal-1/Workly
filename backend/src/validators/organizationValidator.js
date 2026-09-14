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

const updateOrganizationSchema = {
  validate(value) {
    const { payload, details } = validateObject(value, new Set(['name']));
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';

    if (!name) {
      details.push({ path: ['name'], message: 'Name is required.' });
    } else if (name.length < 2 || name.length > 120) {
      details.push({ path: ['name'], message: 'Name must be between 2 and 120 characters.' });
    }

    if (details.length) {
      return { value: payload, error: { details } };
    }

    return { value: { name } };
  },
};

module.exports = { updateOrganizationSchema };
