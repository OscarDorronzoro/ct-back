import { z } from 'zod';

import { idParams, dateRangeQuery } from '../../shared/validation/common';

// Live map: positions older than this are not returned (collar off, lost, in a drawer...)
const LATEST_DEFAULT_HOURS = 72;
const LATEST_MAX_HOURS = 24 * 30;

export const positionParams = idParams('positionId');

// Default: today so far
export const positionListQuery = dateRangeQuery(() => new Date(new Date().setHours(0, 0, 0, 0)));

export const latestPositionsQuery = z.object({
  maxAgeHours: z.coerce.number().int().min(1).max(LATEST_MAX_HOURS)
    .default(LATEST_DEFAULT_HOURS),
});
