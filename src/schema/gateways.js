import {
  pgTable,
  integer,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';

const gateways = pgTable('gateways', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  description: varchar(),
  apiKeyHash: varchar('api_key_hash').notNull().unique(),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export default gateways;
