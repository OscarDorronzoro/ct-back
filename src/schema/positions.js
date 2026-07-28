import {
  pgTable, bigint, integer, real, timestamp,
} from 'drizzle-orm/pg-core';
import geographyPoint from './types/geographyPoint';

const positions = pgTable('positions', {
  id: bigint({ mode: 'number' }).notNull(),
  collarId: integer('collar_id').notNull(),
  cowId: integer('cow_id').notNull(),
  rawRfMessageId: bigint('raw_rf_message_id', { mode: 'number' }),
  zoneId: integer('zone_id'),
  recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull(),
  location: geographyPoint().notNull(),
  speed: real(),
  accuracy: real(),
  signalStrength: real('signal_strength'),
  distanceToPrevious: real('distance_to_previous'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
});

export default positions;
