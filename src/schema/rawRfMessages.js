import {
  pgTable, bigint, integer, smallint, real, timestamp, varchar, jsonb,
} from 'drizzle-orm/pg-core';
import geographyPoint from './types/geographyPoint';

const rawRfMessages = pgTable('raw_rf_messages', {
  id: bigint({ mode: 'number' }).notNull(),
  invalidReasonId: integer('invalid_reason_id'),
  collarCode: integer('collar_code'),
  type: varchar({ length: 16 }),
  integrity: varchar({ length: 16 }),
  raw: varchar({ length: 128 }),
  seq: smallint(),
  data: jsonb(),
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
