import {
  pgTable, integer, varchar, jsonb, timestamp,
} from 'drizzle-orm/pg-core';

const commands = pgTable('commands', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  type: varchar({ length: 20 }).notNull(),
  payload: jsonb(),
  target: varchar({ length: 10 }).notNull(),
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  canceledAt: timestamp('canceled_at', { withTimezone: true, mode: 'date' }),
});

export default commands;
