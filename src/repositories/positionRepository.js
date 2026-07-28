import { and } from 'drizzle-orm';

import db from '../db/drizzle';
import positions from '../schema/positions';
import buildConditions from '../utils/buildConditions';

const positionRepository = {

  async findAll(options = {}, tx = db) {
    const conditions = buildConditions(positions, options.where);

    let query = tx.select().from(positions);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const positionList = await query;
    return positionList;
  },

  async create(position, tx = db) {
    const [created] = await tx
      .insert(positions)
      .values(position)
      .returning();

    return created;
  },

  async createBatch(positionList, tx = db) {
    if (positionList.length === 0) {
      return;
    }

    await tx
      .insert(positions)
      .values(positionList);
  },

};

export default positionRepository;
