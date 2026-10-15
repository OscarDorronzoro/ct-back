import {
  eq, and, or,
  isNull,
} from 'drizzle-orm';

import db from '../db/drizzle';
import cows from '../schema/cows';
import buildConditions from '../utils/buildConditions';
import escapeLike from '../utils/escapeLike';
import unaccentIlike from '../utils/unaccentIlike';

const cowRepository = {

  async findAll(options = {}, tx = db) {
    const conditions = buildConditions(cows, options.where);

    let query = tx
      .select()
      .from(cows);

    if (conditions.length) {
      query = query.where(and(
        ...conditions,
        isNull(cows.deletedAt),
      ));
    }

    const cowList = await query;

    return cowList;
  },

  async findById(id, tx = db) {
    const [result] = await tx
      .select()
      .from(cows)
      .where(and(
        eq(cows.id, id),
        isNull(cows.deletedAt),
      ));

    return result ?? null;
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
    const [deleted] = await tx
      .update(cows)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(cows.id, id))
      .returning();

    return deleted ?? null;
  },

  async search(query, tx = db) {
    const escapedQuery = escapeLike(query);
    const pattern = `%${escapedQuery}%`;

    const conditions = [
      unaccentIlike(cows.alias, pattern),
      unaccentIlike(cows.earTag, pattern),
    ];

    const id = Number(query);

    if (Number.isInteger(id) && id > 0) {
      conditions.push(eq(cows.id, id));
    }

    return tx
      .select()
      .from(cows)
      .where(and(
        or(...conditions),
        isNull(cows.deletedAt),
      ))
      .limit(20);
  },
};

export default cowRepository;
