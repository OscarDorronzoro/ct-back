import { eq, getTableColumns } from 'drizzle-orm';

import db from '../db/drizzle';
import users from '../schema/users';

const {
  password, createdAt, updatedAt, ...userColumns
} = getTableColumns(users);

const userRepository = {
  async findByUsername(username, tx = db) {
    const [user] = await tx
      .select()
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
      .from(users);
  },

  async create(values, tx = db) {
    const [user] = await tx
      .insert(users)
      .values(values)
      .returning(userColumns);

    return user;
  },

  async update(id, values, tx = db) {
    const [user] = await tx
      .update(users)
      .set(values)
      .where(eq(users.id, id))
      .returning(userColumns);

    return user ?? null;
  },

  async delete(id, tx = db) {
    const [user] = await tx
      .delete(users)
      .where(eq(users.id, id))
      .returning(userColumns);

    return user ?? null;
  },
};

export default userRepository;
