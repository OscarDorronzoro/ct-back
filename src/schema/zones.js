import {
  pgTable, integer, varchar, text, timestamp,
} from 'drizzle-orm/pg-core';
import geographyPolygon from './types/geographyPolygon';

const zones = pgTable('zones', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  zoneTypeId: integer('zone_type_id').notNull(),
  name: varchar().notNull(),
  description: text(),
  points: geographyPolygon('polygon').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});

export default zones;
