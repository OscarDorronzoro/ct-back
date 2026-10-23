import {
  pgTable, integer, varchar, boolean, timestamp,
} from 'drizzle-orm/pg-core';

// Vaccines, drugs and antiparasitics. Withdrawal: days after the last application during which
// the meat / milk of the animal can't be sold.
const products = pgTable('products', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar().notNull().unique(),
  // health.constants PRODUCT_TYPES
  type: varchar().notNull(),
  meatWithdrawalDays: integer('meat_withdrawal_days').notNull(),
  milkWithdrawalDays: integer('milk_withdrawal_days').notNull(),
  // Inactive: no longer offered for new events (old events keep it)
  active: boolean().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
});

export default products;
