function validatePayload(value, allowedFields) {
  const payload = value && typeof value === 'object' ? value : {};
  const details = [];

  Object.keys(payload).forEach((key) => {
    if (!allowedFields.has(key)) {
      details.push({ path: [key], message: 'Unexpected field.' });
    }
  });

  return { payload, details };
}

const createProjectSchema = {
  validate(value) {
    const { payload, details } = validatePayload(value, new Set(['name', 'description']));
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const description = payload.description === undefined || payload.description === null
      ? null
      : typeof payload.description === 'string' ? payload.description.trim() : undefined;

    if (!name) details.push({ path: ['name'], message: 'Name is required.' });
    else if (name.length < 2 || name.length > 120) details.push({ path: ['name'], message: 'Name must be between 2 and 120 characters.' });
    if (description === undefined || (description && description.length > 2000)) {
      details.push({ path: ['description'], message: 'Description must be a string of 2000 characters or fewer.' });
    }

    if (details.length) return { value: payload, error: { details } };
    return { value: { name, description } };
  },
};

const updateProjectSchema = {
  validate(value) {
    const { payload, details } = validatePayload(value, new Set(['name', 'description', 'status']));
    const result = {};
    if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
      if (typeof payload.name !== 'string' || payload.name.trim().length < 2 || payload.name.trim().length > 120) {
        details.push({ path: ['name'], message: 'Name must be between 2 and 120 characters.' });
      } else result.name = payload.name.trim();
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
      if (payload.description !== null && (typeof payload.description !== 'string' || payload.description.trim().length > 2000)) {
        details.push({ path: ['description'], message: 'Description must be a string of 2000 characters or fewer.' });
      } else result.description = payload.description === null ? null : payload.description.trim();
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
      if (!['active', 'archived'].includes(payload.status)) details.push({ path: ['status'], message: 'Status must be active or archived.' });
      else result.status = payload.status;
    }
    if (!Object.keys(result).length && !details.length) details.push({ path: [], message: 'At least one mutable field is required.' });
    if (details.length) return { value: payload, error: { details } };
    return { value: result };
  },
};

module.exports = { createProjectSchema, updateProjectSchema };
