import cron from 'node-cron';

import notificationService from './notification.service';
import logger from '../../shared/utils/logger';

let running = false;

// Every 10 seconds: the notifiable events recorded since the last run
function startDeliverNotificationsJob() {
  const job = cron.schedule('*/10 * * * * *', async () => {
    if (running) {
      return;
    }

    running = true;

    try {
      const delivered = await notificationService.deliverNewEvents();

      if (delivered > 0) {
        logger.info({ message: 'Notifications delivered', events: delivered });
      }
    } catch (err) {
      logger.error({ message: 'Notifications job failed', error: err });
    } finally {
      running = false;
    }
  });

  return job;
}

export default startDeliverNotificationsJob;
