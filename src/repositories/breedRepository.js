import { eq, and } from 'drizzle-orm';

import db from '../db/drizzle';
import breeds from '../schema/breeds';
import buildConditions from '../utils/buildConditions';

const breedRepository = {
  async findById(id, tx = db) {
    const [breed] = await tx
      .select()
      .from(breeds)
      .where(eq(breeds.id, id));

    return breed ?? null;
  },

  async findAll(options = {}, tx = db) {
    const conditions = buildConditions(breeds, options.where);

    let query = tx
      .select()
      .from(breeds);

    if (conditions.length) {
      query = query.where(and(...conditions));
    }

    const breedList = await query;

    return breedList;
  },

  async create(breed, tx = db) {
    const [created] = await tx
      .insert(breeds)
      .values(breed)
      .returning();

    return created;
  },

  async update(id, values, tx = db) {
    const [updated] = await tx
      .update(breeds)
      .set(values)
      .where(eq(breeds.id, id))
      .returning();

    return updated ?? null;
  },

  async delete(id, tx = db) {
    const [deleted] = await tx
      .delete(breeds)
      .where(eq(breeds.id, id))
      .returning();

    return deleted ?? null;
  },
};

export default breedRepository;
