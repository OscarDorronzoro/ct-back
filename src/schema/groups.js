import {
  pgTable, integer, varchar,
} from 'drizzle-orm/pg-core';

const groups = pgTable('groups', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar().notNull(),
  description: varchar(),
});

export default groups;
