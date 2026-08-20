import { pgTable, integer, timestamp } from 'drizzle-orm/pg-core';

const cowGroupMemberships = pgTable('cow_group_memberships', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  cowId: integer('cow_id').notNull(),
  groupId: integer('group_id').notNull(),
  dateFrom: timestamp('date_from', { withTimezone: true, mode: 'date' }).notNull(),
  dateTo: timestamp('date_to', { withTimezone: true, mode: 'date' }),
});

export default cowGroupMemberships;
