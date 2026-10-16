import {
  pgTable, bigint, integer, smallint, varchar, timestamp,
} from 'drizzle-orm/pg-core';

const commandTargets = pgTable('command_targets', {
  id: bigint({ mode: 'number' }).notNull().primaryKey().generatedAlwaysAsIdentity(),
  commandId: integer('command_id').notNull(),
  collarId: integer('collar_id').notNull(),
  status: varchar({ length: 10 }).notNull().default('pending'),
  result: varchar({ length: 12 }),
  gatewayId: integer('gateway_id'),
  deliveries: smallint().notNull().default(0),
  deliveredAt: timestamp('delivered_at', { withTimezone: true, mode: 'date' }),
  completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
});

export default commandTargets;
