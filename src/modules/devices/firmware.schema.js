import {
  pgTable, integer, smallint, varchar, char, text, timestamp,
} from 'drizzle-orm/pg-core';

const firmwares = pgTable('firmwares', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  code: smallint().notNull(),
  version: varchar({ length: 20 }).notNull(),
  filename: varchar().notNull(),
  size: integer().notNull(),
  md5: char({ length: 32 }).notNull(),
  sha256: char({ length: 64 }).notNull(),
  notes: text(),
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});

export default firmwares;
