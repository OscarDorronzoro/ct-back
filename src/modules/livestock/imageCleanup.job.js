import cron from 'node-cron';

import imageService from './image.service';
import logger from '../../shared/utils/logger';

function startImageCleanupJob() {
  const job = cron.schedule(
    '0 3 * * 0',
    async () => {
      logger.debug({
        message: 'Starting orphan image cleanup job',
      });

      try {
        await imageService.processOrphanImages();
      } catch (err) {
        logger.error({
          message: 'Orphan image cleanup job failed',
          error: err,
        });
      }
    },
  );

  return job;
}

export default startImageCleanupJob;
