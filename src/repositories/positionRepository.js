import {
  and, eq, gte, desc, isNull, sql,
} from 'drizzle-orm';

import db from '../db/drizzle';
import positions from '../schema/positions';
import collars from '../schema/collars';
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

  // Latest position of each active collar, if newer than `since`.
  // One indexed lookup per collar (idx_positions_collar_recorded_at), not a scan of the window.
  async findLatestByCollar(since, tx = db) {
    const latest = tx
      .select()
      .from(positions)
      .where(and(
        eq(positions.collarId, collars.id),
        gte(positions.recordedAt, since),
      ))
      .orderBy(desc(positions.recordedAt))
      .limit(1)
      .as('latest');

    const rows = await tx
      .select()
      .from(collars)
      .innerJoinLateral(latest, sql`true`)
      .where(isNull(collars.deletedAt));

    return rows.map((row) => row.latest);
  },

  async findById(id, tx = db) {
    const [result] = await tx
      .select()
      .from(positions)
      .where(eq(positions.id, id));

    return result ?? null;
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
