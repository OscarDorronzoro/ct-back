import cron from 'node-cron';

import authService from './auth.service';
import logger from '../../shared/utils/logger';

// Weekly: expired refresh tokens and the sessions left without tokens
function startSessionCleanupJob() {
  const job = cron.schedule(
    '0 4 * * 0',
    async () => {
      try {
        const deleted = await authService.cleanup();

        logger.info({
          message: 'Session cleanup job done',
          ...deleted,
        });
      } catch (err) {
        logger.error({
          message: 'Session cleanup job failed',
          error: err,
        });
      }
    },
  );

  return job;
}

export default startSessionCleanupJob;
