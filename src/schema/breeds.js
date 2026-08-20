import { pgTable, integer, varchar } from 'drizzle-orm/pg-core';

const breeds = pgTable('breeds', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar().notNull().unique(),
});

export default breeds;
