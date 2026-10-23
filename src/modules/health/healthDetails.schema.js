import {
  pgTable, integer, varchar, text, real, date, timestamp,
} from 'drizzle-orm/pg-core';

// Detail tables of animal_events: one row per event of their type, event_id = animal_events.id.
// Withdrawal ends are computed from the product when the event is recorded (null: none).

export const vaccinations = pgTable('vaccinations', {
  eventId: integer('event_id').notNull().primaryKey(),
  productId: integer('product_id').notNull(),
  // Free text: 2 ml, 1 dosis...
  dose: varchar(),
  batch: varchar(),
  route: varchar(),
  nextDoseOn: date('next_dose_on', { mode: 'string' }),
  meatWithdrawalUntil: timestamp('meat_withdrawal_until', { withTimezone: true, mode: 'date' }),
  milkWithdrawalUntil: timestamp('milk_withdrawal_until', { withTimezone: true, mode: 'date' }),
});

export const treatments = pgTable('treatments', {
  eventId: integer('event_id').notNull().primaryKey(),
  productId: integer('product_id').notNull(),
  diagnosis: text(),
  dose: varchar(),
  route: varchar(),
  // Days of application, starting on the day of the event
  durationDays: integer('duration_days').notNull(),
  meatWithdrawalUntil: timestamp('meat_withdrawal_until', { withTimezone: true, mode: 'date' }),
  milkWithdrawalUntil: timestamp('milk_withdrawal_until', { withTimezone: true, mode: 'date' }),
});

export const examinations = pgTable('examinations', {
  eventId: integer('event_id').notNull().primaryKey(),
  finding: text(),
  // °C
  temperature: real(),
  // Body condition score, 1 (very thin) to 5 (obese)
  bodyCondition: real('body_condition'),
});

export const weighings = pgTable('weighings', {
  eventId: integer('event_id').notNull().primaryKey(),
  weightKg: real('weight_kg').notNull(),
});
