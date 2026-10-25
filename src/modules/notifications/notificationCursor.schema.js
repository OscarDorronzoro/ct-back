import { pgTable, boolean, bigint } from 'drizzle-orm/pg-core';

// Last event already handled by the notifications (a single row)
const notificationCursor = pgTable('notification_cursor', {
  id: boolean().notNull().primaryKey(),
  lastEventId: bigint('last_event_id', { mode: 'number' }).notNull(),
});

export default notificationCursor;
