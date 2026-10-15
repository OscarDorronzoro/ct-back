import {
  pgTable, uuid, integer, varchar, timestamp, inet,
} from 'drizzle-orm/pg-core';

// One row per login (device). Its refresh tokens rotate; the session stays until revoked
// or until its last token expires without being used.
const userSessions = pgTable('user_sessions', {
  id: uuid().primaryKey().defaultRandom(),
  userId: integer('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  createdIp: inet('created_ip'),
  lastIp: inet('last_ip'),
  userAgent: varchar('user_agent', { length: 512 }),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
  // logout | reuse | admin | password
  revokedReason: varchar('revoked_reason', { length: 16 }),
});

export default userSessions;
