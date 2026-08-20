import {
  pgTable, integer, varchar, text, timestamp,
} from 'drizzle-orm/pg-core';

const collars = pgTable('collars', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  firmwareVersion: varchar('firmware_version').notNull(),
  description: text(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});

export default collars;
