import cron from 'node-cron';

import firmwareService from '../services/firmwareService';
import logger from '../utils/logger';

// Weekly: firmware binaries that no firmware (or unfinished OTA command) needs anymore
function startFirmwareCleanupJob() {
  const job = cron.schedule(
    '30 4 * * 0',
    async () => {
      try {
        const result = await firmwareService.cleanupFiles();

        logger.info({
          message: 'Firmware cleanup job done',
          ...result,
        });
      } catch (err) {
        logger.error({
          message: 'Firmware cleanup job failed',
          error: err,
        });
      }
    },
  );

  return job;
}

export default startFirmwareCleanupJob;
