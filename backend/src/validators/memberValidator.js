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

function enumSchema(field, values) {
  return {
    validate(value) {
      const { payload, details } = validatePayload(value, new Set([field]));
      if (typeof payload[field] !== 'string' || !values.includes(payload[field])) {
        details.push({ path: [field], message: `${field} must be one of: ${values.join(', ')}.` });
      }
      return details.length ? { value: payload, error: { details } } : { value: { [field]: payload[field] } };
    },
  };
}

const updateMemberRoleSchema = enumSchema('role', ['admin', 'manager', 'member']);
const updateMemberStatusSchema = enumSchema('status', ['active', 'invited', 'removed']);

module.exports = { updateMemberRoleSchema, updateMemberStatusSchema };
