const auth = (req, res, next) => {
  if (!req.user) {
    return next({
      statusCode: 401,
      code: 'AUTH_REQUIRED',
      message: 'Authentication is required to access this resource.',
    });
  }

  return next();
};

module.exports = auth;
