import {
  eq, and, or,
  isNull, inArray,
} from 'drizzle-orm';

import db from '../db/drizzle';
import collars from '../schema/collars';
import buildConditions from '../utils/buildConditions';
import escapeLike from '../utils/escapeLike';
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

  // Deleted included: historic positions keep their collar
  async findByIdWithDeleted(id, tx = db) {
    const [result] = await tx
      .select()
      .from(collars)
      .where(eq(collars.id, id));

    return result ?? null;
  },

  async findByIds(ids, tx = db) {
    if (ids.length === 0) {
      return [];
    }

    return tx
      .select()
      .from(collars)
      .where(and(
        inArray(collars.id, ids),
        isNull(collars.deletedAt),
      ));
  },

  async findByCode(code, tx = db) {
    const [result] = await tx
      .select()
      .from(collars)
      .where(and(
        eq(collars.code, code),
        isNull(collars.deletedAt),
      ));

    return result ?? null;
  },

  async findByMac(mac, tx = db) {
    const [result] = await tx
      .select()
      .from(collars)
      .where(and(
        eq(collars.mac, mac),
        isNull(collars.deletedAt),
      ));

    return result ?? null;
  },

  // Codes of every collar, deleted included
  async findAllCodes(tx = db) {
    return tx
      .select({
        code: collars.code,
        deletedAt: collars.deletedAt,
      })
      .from(collars);
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
    const escapedQuery = escapeLike(query);
    const pattern = `%${escapedQuery}%`;

    const conditions = [
      unaccentIlike(collars.description, pattern),
    ];

    const id = Number(query);

    if (Number.isInteger(id) && id > 0) {
      conditions.push(eq(collars.id, id));

      if (id <= 255) {
        conditions.push(eq(collars.code, id));
      }
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
