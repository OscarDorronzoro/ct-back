import {
  pgTable, integer, timestamp,
} from 'drizzle-orm/pg-core';

const cowCollarAssignments = pgTable('cow_collar_assignments', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  cowId: integer('cow_id').notNull(),
  collarId: integer('collar_id').notNull(),
  dateFrom: timestamp('date_from', { withTimezone: true, mode: 'date' }).notNull(),
  dateTo: timestamp('date_to', { withTimezone: true, mode: 'date' }),
});

export default cowCollarAssignments;
