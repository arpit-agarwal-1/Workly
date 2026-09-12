const authorize = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required.',
      });
    }

    if (!requiredPermission) {
      return next();
    }

    const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    const hasGlobalAccess = permissions.includes('*');
    const hasPermission = permissions.includes(requiredPermission);

    if (hasGlobalAccess || hasPermission) {
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
