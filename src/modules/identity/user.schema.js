import {
  pgTable, integer, varchar, timestamp,
} from 'drizzle-orm/pg-core';

const users = pgTable('users', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  username: varchar(),
  password: varchar(),
  role: integer().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
});

export default users;
