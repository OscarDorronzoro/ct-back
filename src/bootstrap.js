import './config/env';
import logger from './utils/logger';

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', {
    error: err,
    stack: err.stack,
  });

  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });

  process.exit(1);
});

import('./app');
