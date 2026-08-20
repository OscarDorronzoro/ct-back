import logger from '../utils/logger';
import AppError from '../errors/AppError';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res
      .status(err.httpStatus)
      .json({ error: err.code });
  }

  logger.error(err);

  return res
    .status(500)
    .json({ error: 'Internal server error' });
}

export default errorHandler;
