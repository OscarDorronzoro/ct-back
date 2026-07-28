import {
  pgTable, bigint, integer, real, timestamp, varchar,
} from 'drizzle-orm/pg-core';
import geographyPoint from './types/geographyPoint';

const rawRfMessages = pgTable('raw_rf_messages', {
  id: bigint({ mode: 'number' }).notNull(),
  invalidReasonId: integer('invalid_reason_id'),
  collarId: integer('collar_id').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull(),
  location: geographyPoint('location'),
  altitude: real(),
  speed: real(),
  satellitesCount: integer('satellites_count'),
  hdop: real(),
  voltage: real(),
  rssi: real(),
  snr: real(),
  crc: varchar(),
  gatewayId: integer('gateway_id'),
  processedAt: timestamp('processed_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
});

export default rawRfMessages;
