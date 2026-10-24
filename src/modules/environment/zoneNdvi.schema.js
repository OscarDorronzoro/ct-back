import {
  pgTable, integer, real, date, varchar, timestamp, unique,
} from 'drizzle-orm/pg-core';

// Vegetation index (NDVI) of each zone on each date with a usable satellite image (Sentinel-2,
// through the Copernicus Data Space). Only the clear part of the zone counts: clouds, cloud
// shadows and water are left out pixel by pixel.
const zoneNdviObservations = pgTable('zone_ndvi_observations', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  zoneId: integer('zone_id').notNull(),
  // Date of the image (UTC)
  acquiredOn: date('acquired_on', { mode: 'string' }).notNull(),
  // -1..1: bare soil ~0.1-0.2, sparse pasture ~0.3-0.5, dense pasture 0.6 or more
  ndviMean: real('ndvi_mean').notNull(),
  ndviMin: real('ndvi_min').notNull(),
  ndviMax: real('ndvi_max').notNull(),
  ndviStdev: real('ndvi_stdev').notNull(),
  // Part of the zone seen clear (0..1) and its pixels of 10 m
  validFraction: real('valid_fraction').notNull(),
  pixels: integer().notNull(),
  source: varchar().notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true, mode: 'date' }).notNull(),
}, (table) => [unique().on(table.zoneId, table.acquiredOn)]);

export default zoneNdviObservations;
