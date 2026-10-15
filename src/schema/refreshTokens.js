import {
  pgTable,
  integer,
  varchar,
  timestamp,
  uuid,
  inet,
} from 'drizzle-orm/pg-core';

const refreshTokens = pgTable('refresh_tokens', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull(),
  sessionId: uuid('session_id').notNull(),
  tokenHash: varchar('token_hash').notNull().unique(),
  // IP the token was issued to (login or rotation)
  ip: inet(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  // Replaced by a newer token. Presenting it again (after a grace period) means it was copied.
  rotatedAt: timestamp('rotated_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export default refreshTokens;
