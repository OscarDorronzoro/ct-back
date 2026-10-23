import {
  pgTable, integer, varchar, text, timestamp,
} from 'drizzle-orm/pg-core';

// Events of the life of the animal entered by a person (vaccinations, treatments...): the base of
// the clinical history. The data of each type is in its detail table (same id).
// They are never edited or deleted: a wrong one is voided and stays in the history.
const animalEvents = pgTable('animal_events', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  cowId: integer('cow_id').notNull(),
  // health.constants EVENT_TYPES
  type: varchar().notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull(),
  notes: text(),
  recordedBy: integer('recorded_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  voidedAt: timestamp('voided_at', { withTimezone: true, mode: 'date' }),
  voidedBy: integer('voided_by'),
  voidReason: text('void_reason'),
});

export default animalEvents;
