import {
  eq, and, or,
  isNull,
} from 'drizzle-orm';

import db from '../db/drizzle';
import collars from '../schema/collars';
import buildConditions from '../utils/buildConditions';
import validator from '../utils/validator';
import unaccentIlike from '../utils/unaccentIlike';

const collarRepository = {
  async findAll(options = {}, tx = db) {
    const conditions = buildConditions(collars, options.where);

    const query = tx
      .select()
      .from(collars)
      .where(
        and(
          ...conditions,
          isNull(collars.deletedAt),
        ),
      );

    const collarList = await query;

    return collarList;
  },

  async findById(id, tx = db) {
    const result = await tx
      .select()
      .from(collars)
      .where(and(
        eq(collars.id, id),
        isNull(collars.deletedAt),
      ));

    return result[0] ?? null;
  },

  async create(collar, tx = db) {
    const [created] = await tx
      .insert(collars)
      .values(collar)
      .returning();

    return created;
  },

  async update(id, values, tx = db) {
    const [updated] = await tx
      .update(collars)
      .set(values)
      .where(eq(collars.id, id))
      .returning();

    return updated ?? null;
  },

  async delete(id, tx = db) {
    const now = new Date();
    const [deleted] = await tx
      .update(collars)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(collars.id, id))
      .returning();

    return deleted ?? null;
  },

  async search(query, tx = db) {
    const escapedQuery = validator.escapeLike(query);
    const pattern = `%${escapedQuery}%`;

    const conditions = [
      unaccentIlike(collars.description, pattern),
    ];

    const id = Number(query);

    if (Number.isInteger(id) && id > 0) {
      conditions.push(eq(collars.id, id));
    }

    return tx
      .select()
      .from(collars)
      .where(and(
        or(...conditions),
        isNull(collars.deletedAt),
      ))
      .limit(20);
  },
};

export default collarRepository;
