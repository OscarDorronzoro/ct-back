import { z } from 'zod';

import { id, idParams, optionalField } from '../../shared/validation/common';

const MIN_POINTS = 3;
const MAX_POINTS = 500;

export const zoneParams = idParams('zoneId');

export const zoneListQuery = z.object({
  zoneTypeId: optionalField(id),
});

const vertex = z.tuple([
  z.number().min(-90).max(90),
  z.number().min(-180).max(180),
]);

const sameVertex = (a, b) => a[0] === b[0] && a[1] === b[1];

// [[lat, lon], ...]. A closing vertex equal to the first one is removed.
// Whether the polygon is valid (edges don't cross) is checked by PostGIS in zoneService.
const points = z.array(vertex)
  .transform((list) => (list.length > 1 && sameVertex(list[0], list[list.length - 1])
    ? list.slice(0, -1)
    : list))
  .pipe(z.array(vertex).min(MIN_POINTS).max(MAX_POINTS));

export const createZoneBody = z.object({
  name: z.string().trim().min(1, 'is required'),
  zoneTypeId: id,
  description: z.string().nullish().transform((value) => value || null),
  points,
});

// Only the fields sent change
export const updateZoneBody = createZoneBody.partial();
