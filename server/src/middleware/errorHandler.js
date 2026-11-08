export const errorHandler = (error, _req, res, _next) => {
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : error.name === 'ValidationError'
      ? 400
      : error.code === 11000
        ? 409
        : 500;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    success: false,
    message: status >= 500
      ? 'Internal server error.'
      : error.code === 11000
        ? 'A record with the same unique value already exists.'
        : error.message
  });
};
