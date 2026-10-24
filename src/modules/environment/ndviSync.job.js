import cron from 'node-cron';

import ndviService from './ndvi.service';
import logger from '../../shared/utils/logger';

// Daily: new Sentinel-2 images of the watched zones (one every few days, cloud permitting)
function startNdviSyncJob() {
  const job = cron.schedule(
    '40 6 * * *',
    async () => {
      try {
        const result = await ndviService.sync();

        logger.info({ message: 'NDVI sync job done', ...result });
      } catch (err) {
        logger.error({ message: 'NDVI sync job failed', error: err });
      }
    },
  );

  return job;
}

export default startNdviSyncJob;
