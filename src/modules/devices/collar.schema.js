import {
  pgTable, integer, smallint, varchar, text, jsonb, timestamp,
} from 'drizzle-orm/pg-core';

const collars = pgTable('collars', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  code: smallint().notNull(),
  mac: varchar({ length: 12 }),
  firmwareCode: smallint('firmware_code'),
  firmwareVersion: varchar('firmware_version'),
  params: jsonb(),
  description: text(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});

export default collars;
