import cron from 'node-cron';

import cowCategoryService from './cowCategory.service';
import logger from '../../shared/utils/logger';

// Daily: categories that change with age (ternera -> vaquillona, novillito -> novillo...)
function startCategoryRulesJob() {
  const job = cron.schedule(
    '15 3 * * *',
    async () => {
      try {
        const result = await cowCategoryService.applyRulesToAll();

        logger.info({
          message: 'Category rules job done',
          ...result,
        });
      } catch (err) {
        logger.error({
          message: 'Category rules job failed',
          error: err,
        });
      }
    },
  );

  return job;
}

export default startCategoryRulesJob;
