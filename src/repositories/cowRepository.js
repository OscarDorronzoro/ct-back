import { eq, and } from 'drizzle-orm';

import db from '../db/drizzle';
import cows from '../schema/cows';
import buildConditions from '../utils/buildConditions';

const cowRepository = {

  async findAll(options = {}, tx = db) {
    const conditions = buildConditions(cows, options.where);

    let query = tx
      .select()
      .from(cows);

    if (conditions.length) {
      query = query.where(and(...conditions));
    }

    const cowList = await query;

    return cowList;
  },

  async findById(id, tx = db) {
    const result = await tx
      .select()
      .from(cows)
      .where(eq(cows.id, id));

    return result[0] ?? null;
  },

  async create(cow, tx = db) {
    const [created] = await tx
      .insert(cows)
      .values(cow)
      .returning();

    return created;
  },

  async update(id, values, tx = db) {
    const [updated] = await tx
      .update(cows)
      .set(values)
      .where(eq(cows.id, id))
      .returning();

    return updated ?? null;
  },

  async delete(id, tx = db) {
    await tx
      .delete(cows)
      .where(eq(cows.id, id));
  },
};

export default cowRepository;
