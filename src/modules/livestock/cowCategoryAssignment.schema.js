import {
  pgTable, integer, varchar, timestamp,
} from 'drizzle-orm/pg-core';

// Category history of each cow (the current one is also in cows.category_id): which category,
// from when until when, and why it changed.
const cowCategoryAssignments = pgTable('cow_category_assignments', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  cowId: integer('cow_id').notNull(),
  categoryId: integer('category_id').notNull(),
  dateFrom: timestamp('date_from', { withTimezone: true, mode: 'date' }).notNull(),
  // null: current
  dateTo: timestamp('date_to', { withTimezone: true, mode: 'date' }),
  // manual (cow form) | automatic (age rules) | event (castration, and later reproductive events)
  source: varchar().notNull(),
  eventId: integer('event_id'),
  assignedBy: integer('assigned_by'),
});

export default cowCategoryAssignments;
