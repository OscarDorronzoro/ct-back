import {
  and, eq, gte, desc, isNull, sql,
} from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import positions from './position.schema';
import collars from '../devices/collar.schema';
import buildConditions from '../../shared/utils/buildConditions';

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

  // Distance traveled per collar in [dateFrom, dateTo): sum of the distances between
  // consecutive positions inside the range. The first position of each collar in the range is
  // left out, since its distance comes from a position before the range.
  async distanceByCollar({ dateFrom, dateTo, collarId }, tx = db) {
    const collarFilter = collarId ? sql`AND collar_id = ${collarId}` : sql``;

    const { rows } = await tx.execute(sql`
      SELECT collar_id,
        count(*)::int AS positions,
        coalesce(sum(CASE WHEN previous_id IS NULL THEN 0 ELSE distance_to_previous END), 0)
          AS meters
      FROM (
        SELECT collar_id, distance_to_previous,
          lag(id) OVER (PARTITION BY collar_id ORDER BY recorded_at) AS previous_id
        FROM positions
        WHERE recorded_at >= ${dateFrom} AND recorded_at < ${dateTo} ${collarFilter}
      ) ranged
      GROUP BY collar_id
      ORDER BY collar_id`);

    return rows.map((row) => ({
      collarId: row.collar_id,
      positions: row.positions,
      meters: Math.round(Number(row.meters)),
    }));
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
