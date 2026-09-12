const crypto = require('crypto');

const requestIdMiddleware = (req, res, next) => {
  const incomingRequestId = req.get('x-request-id');
  const requestId =
    incomingRequestId && /^[A-Za-z0-9-_]{8,128}$/.test(incomingRequestId)
      ? incomingRequestId
      : crypto.randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

module.exports = requestIdMiddleware;
