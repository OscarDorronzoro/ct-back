import {
  eq, getTableColumns, sql,
} from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import users from './user.schema';
import userRoles from './userRole.schema';
import ROLES from './roles.constants';

const {
  password, createdAt, updatedAt, ...publicColumns
} = getTableColumns(users);

// Roles of the user as a sorted array (empty if none)
const roles = sql`coalesce(
  (SELECT array_agg(${userRoles.role} ORDER BY ${userRoles.role})
   FROM ${userRoles} WHERE ${userRoles.userId} = ${users.id}),
  '{}')`.mapWith((value) => value).as('roles');

const userColumns = { ...publicColumns, roles };

const userRepository = {
  // With the password hash, for the login
  async findByUsername(username, tx = db) {
    const [user] = await tx
      .select({ ...getTableColumns(users), roles })
      .from(users)
      .where(eq(users.username, username));

    return user ?? null;
  },

  async checkUsernameExists(username, tx = db) {
    const [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username));

    return user !== undefined;
  },

  async findById(id, tx = db) {
    const [user] = await tx
      .select(userColumns)
      .from(users)
      .where(eq(users.id, id));

    return user ?? null;
  },

  async findAll(tx = db) {
    return tx
      .select(userColumns)
      .from(users)
      .orderBy(users.username);
  },

  async create(values, tx = db) {
    const [user] = await tx
      .insert(users)
      .values(values)
      .returning({ id: users.id });

    return user;
  },

  async update(id, values, tx = db) {
    const [user] = await tx
      .update(users)
      .set(values)
      .where(eq(users.id, id))
      .returning({ id: users.id });

    return user ?? null;
  },

  // Ids of the admins, locking their rows until the transaction ends: a concurrent transaction
  // doing the same waits, and then sees this one's changes (READ COMMITTED re-checks locked rows)
  async lockAdminIds(tx) {
    const rows = await tx
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.role, ROLES.ADMIN))
      .for('update');

    return rows.map((row) => row.userId);
  },

  // Replaces the roles of the user
  async setRoles(userId, roleList, tx = db) {
    await tx
      .delete(userRoles)
      .where(eq(userRoles.userId, userId));

    await tx
      .insert(userRoles)
      .values(roleList.map((role) => ({ userId, role })));
  },

  // Their roles go with them (ON DELETE CASCADE)
  async delete(id, tx = db) {
    const [user] = await tx
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });

    return user ?? null;
  },
};

export default userRepository;
