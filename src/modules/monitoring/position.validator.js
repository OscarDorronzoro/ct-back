import { z } from 'zod';

import {
  id, idParams, optionalField, dateRangeQuery,
} from '../../shared/validation/common';

// Live map: positions older than this are not returned (collar off, lost, in a drawer...)
const LATEST_DEFAULT_HOURS = 72;
const LATEST_MAX_HOURS = 24 * 30;

export const positionParams = idParams('positionId');

const startOfToday = () => new Date(new Date().setHours(0, 0, 0, 0));

// Default: today so far
export const positionListQuery = dateRangeQuery(startOfToday);

// Distance traveled in the range; optionally a single collar
export const distanceQuery = dateRangeQuery(startOfToday, {
  collarId: optionalField(id),
});

export const latestPositionsQuery = z.object({
  maxAgeHours: z.coerce.number().int().min(1).max(LATEST_MAX_HOURS)
    .default(LATEST_DEFAULT_HOURS),
});
