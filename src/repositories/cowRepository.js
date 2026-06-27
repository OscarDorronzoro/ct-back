import { eq } from 'drizzle-orm';

import db from '../db/drizzle';
import cows from '../schema/cows';

const cowRepository = {

  async findAll() {
    const cowList = await db
      .select()
      .from(cows);
    return cowList;
  },

  async findById(id) {
    const result = await db
      .select()
      .from(cows)
      .where(eq(cows.id, id));

    return result[0] ?? null;
  },

  async create(cow) {
    const [created] = await db
      .insert(cows)
      .values(cow)
      .returning();

    return created;
  },

  async update(id, values) {
    const [updated] = await db
      .update(cows)
      .set(values)
      .where(eq(cows.id, id))
      .returning();

    return updated ?? null;
  },

  async delete(id) {
    await db
      .delete(cows)
      .where(eq(cows.id, id));
  },
};

export default cowRepository;
