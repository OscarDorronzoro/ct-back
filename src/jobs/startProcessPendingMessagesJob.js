import cron from 'node-cron';

import rawRfMessageService from '../services/rawRfMessageService';
import logger from '../utils/logger';

let running = false;

function startProcessPendingMessagesJob() {
  const job = cron.schedule('*/5 * * * * *', async () => {
    if (running) {
      logger.warn({
        message: 'processPendingMessages job already running',
      });

      return;
    }

    running = true;

    try {
      await rawRfMessageService.processPendingMessages();
    } finally {
      running = false;
    }
  });

  job.on('execution:missed', (ctx) => {
    logger.warn({
      message: 'processPendingMessages execution missed',
      execution: ctx.execution,
    });
  });

  job.on('execution:failed', (ctx) => {
    logger.error({
      message: 'processPendingMessages execution failed',
      execution: ctx.execution,
    });
  });

  return job;
}

export default startProcessPendingMessagesJob;
