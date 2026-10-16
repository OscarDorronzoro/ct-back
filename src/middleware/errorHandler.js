import http from 'http';
import multer from 'multer';

import logger from '../utils/logger';
import AppError from '../errors/AppError';

// 4xx status carried by errors from Express and its middleware: invalid JSON body (400),
// payload too large (413), res.sendFile (403, 404)
function clientErrorStatus(err) {
  const status = err.status ?? err.statusCode;

  return Number.isInteger(status) && status >= 400 && status < 500 ? status : null;
}

// 413 -> 'PAYLOAD_TOO_LARGE', same style as the AppError codes
function statusCode(status) {
  return http.STATUS_CODES[status].toUpperCase().replace(/\W+/g, '_');
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // The response already started (e.g. a file being sent): Express closes the connection
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res
      .status(err.httpStatus)
      .json({
        error: err.code,
        ...(err.message !== err.code && { message: err.message }),
      });
  }

  // Upload rejected by multer: file too large, unexpected field...
  if (err instanceof multer.MulterError) {
    return res
      .status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400)
      .json({ error: err.code, message: err.message });
  }

  const status = clientErrorStatus(err);

  if (status) {
    logger.debug({
      message: 'Client error',
      method: req.method,
      url: req.originalUrl,
      error: err.message,
    });

    return res
      .status(status)
      .json({
        error: statusCode(status),
        // Only messages meant for the client (http-errors sets expose for 4xx)
        ...(err.expose && { message: err.message }),
      });
  }

  logger.error(err);

  return res
    .status(500)
    .json({ error: 'Internal server error' });
}

export default errorHandler;
