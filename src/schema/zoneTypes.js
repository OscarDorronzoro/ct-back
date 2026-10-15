import { pgTable, integer, varchar } from 'drizzle-orm/pg-core';

const zoneTypes = pgTable('zone_types', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar().notNull(),
});

export default zoneTypes;
