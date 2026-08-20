import { eq, and } from 'drizzle-orm';

import db from '../db/drizzle';
import groups from '../schema/groups';
import buildConditions from '../utils/buildConditions';

const groupRepository = {

  async findAll(options = {}, tx = db) {
    const conditions = buildConditions(groups, options.where);

    let query = tx
      .select()
      .from(groups);

    if (conditions.length) {
      query = query.where(and(...conditions));
    }

    const groupList = await query;

    return groupList;
  },

  async findById(id, tx = db) {
    const result = await tx
      .select()
      .from(groups)
      .where(eq(groups.id, id));

    return result[0] ?? null;
  },

  async create(group, tx = db) {
    const [created] = await tx
      .insert(groups)
      .values(group)
      .returning();

    return created;
  },

  async update(id, values, tx = db) {
    const [updated] = await tx
      .update(groups)
      .set(values)
      .where(eq(groups.id, id))
      .returning();

    return updated ?? null;
  },

  async delete(id, tx = db) {
    const [deleted] = await tx
      .delete(groups)
      .where(eq(groups.id, id))
      .returning();

    return deleted ?? null;
  },

};

export default groupRepository;
