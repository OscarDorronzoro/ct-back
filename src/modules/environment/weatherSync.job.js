import cron from 'node-cron';

import weatherService from './weather.service';
import logger from '../../shared/utils/logger';

// Hourly, a few minutes past the hour so the provider has the hour that just ended
function startWeatherSyncJob() {
  const job = cron.schedule(
    '5 * * * *',
    async () => {
      try {
        const result = await weatherService.sync();

        logger.info({
          message: 'Weather sync job done',
          ...result,
        });
      } catch (err) {
        logger.error({
          message: 'Weather sync job failed',
          error: err,
        });
      }
    },
  );

  return job;
}

export default startWeatherSyncJob;
