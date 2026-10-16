import {
  pgTable, bigint, integer, jsonb, timestamp,
} from 'drizzle-orm/pg-core';

const events = pgTable('events', {
  id: bigint({ mode: 'number' }).notNull().primaryKey().generatedAlwaysAsIdentity(),
  eventTypeId: integer('event_type_id').notNull(),
  cowId: integer('cow_id'),
  collarId: integer('collar_id'),
  positionId: bigint('position_id', { mode: 'number' }),
  rawRfMessageId: bigint('raw_rf_message_id', { mode: 'number' }),
  zoneId: integer('zone_id'),
  occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull(),
  metadata: jsonb(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
});

export default events;
