import {
  pgTable, integer, varchar, primaryKey,
} from 'drizzle-orm/pg-core';

// Roles of each user (one row per role; see roles.constants)
const userRoles = pgTable('user_roles', {
  userId: integer('user_id').notNull(),
  role: varchar().notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.role] })]);

export default userRoles;
