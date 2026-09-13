const { ROLE_PERMISSIONS } = require('../config/permissions');

const authorize = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required.',
      });
    }

    if (!req.tenant) {
      return next({
        statusCode: 403,
        code: 'TENANT_CONTEXT_REQUIRED',
        message: 'Tenant context is required.',
      });
    }

    const permissions = ROLE_PERMISSIONS[req.tenant.role] || [];
    const hasPermission = typeof requiredPermission === 'string' && permissions.includes(requiredPermission);

    if (hasPermission) {
      return next();
    }

    return next({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action.',
    });
  };
};

module.exports = authorize;
