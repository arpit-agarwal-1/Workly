const auth = (req, res, next) => {
  delete req.user;
  const authorization = req.get('authorization');
  if (typeof authorization !== 'string') {
    return next({
      statusCode: 401,
      code: 'AUTH_REQUIRED',
      message: 'Authentication is required to access this resource.',
    });
  }

  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) {
    return next({
      statusCode: 401,
      code: 'AUTH_REQUIRED',
      message: 'Authentication is required to access this resource.',
    });
  }

  try {
    const { verifyAccessToken } = require('../utils/jwt');
    const payload = verifyAccessToken(match[1]);
    req.user = {
      userId: payload.sub,
      sub: payload.sub,
      sessionId: payload.sid,
      sid: payload.sid,
    };
  } catch (error) {
    return next({
      statusCode: 401,
      code: 'AUTH_INVALID_TOKEN',
      message: 'Authentication failed.',
    });
  }

  return next();
};

module.exports = auth;
