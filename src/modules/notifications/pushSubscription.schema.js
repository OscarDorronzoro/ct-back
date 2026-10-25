import {
  pgTable, integer, uuid, text, varchar, timestamp,
} from 'drizzle-orm/pg-core';

// A device that receives push notifications (Web Push), tied to the session it was turned on with
const pushSubscriptions = pgTable('push_subscriptions', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull(),
  sessionId: uuid('session_id').notNull(),
  // URL of the push service of the browser: identifies the device
  endpoint: text().notNull().unique(),
  p256dh: varchar().notNull(),
  auth: varchar().notNull(),
  userAgent: varchar('user_agent', { length: 512 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  lastSentAt: timestamp('last_sent_at', { withTimezone: true, mode: 'date' }),
});

export default pushSubscriptions;
