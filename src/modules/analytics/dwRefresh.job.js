import cron from 'node-cron';

import dwService from './dw.service';
import logger from '../../shared/utils/logger';

let running = false;

// Hourly, after the weather sync (minute 5): recomputes yesterday and today in the dw
function startDwRefreshJob() {
  const job = cron.schedule(
    '20 * * * *',
    async () => {
      // A first load can take longer than an hour on a slow server: never two at once
      if (running) {
        logger.warn({ message: 'dw refresh still running, skipped' });
        return;
      }

      running = true;
      try {
        const stats = await dwService.refresh();

        logger.info({ message: 'dw refresh job done', ...stats });
      } catch (err) {
        logger.error({ message: 'dw refresh job failed', error: err });
      } finally {
        running = false;
      }
    },
  );

  return job;
}

export default startDwRefreshJob;
