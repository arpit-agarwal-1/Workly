const notFound = (req, res, next) => {
  const error = new Error('Route not found');
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
};

module.exports = notFound;
