import {
  pgTable,
  integer,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';

const refreshTokens = pgTable('refresh_tokens', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull(),
  tokenHash: varchar('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export default refreshTokens;
