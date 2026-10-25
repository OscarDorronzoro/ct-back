import {
  eq, and, isNull, asc, sql,
} from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import zones from './zone.schema';
import zoneTypes from './zoneType.schema';
import buildConditions from '../../shared/utils/buildConditions';

const zoneRepository = {

  async findAll(options = {}, tx = db) {
    const conditions = buildConditions(zones, options.where);

    return tx
      .select()
      .from(zones)
      .where(and(
        ...conditions,
        isNull(zones.deletedAt),
      ))
      .orderBy(asc(zones.name));
  },

  async findById(id, tx = db) {
    const [result] = await tx
      .select()
      .from(zones)
      .where(and(
        eq(zones.id, id),
        isNull(zones.deletedAt),
      ));

    return result ?? null;
  },

  async findTypes(tx = db) {
    return tx
      .select()
      .from(zoneTypes)
      .orderBy(asc(zoneTypes.id));
  },

  async findTypeById(id, tx = db) {
    const [result] = await tx
      .select()
      .from(zoneTypes)
      .where(eq(zoneTypes.id, id));

    return result ?? null;
  },

  // Center of the active zones ({ latitude, longitude }), or null if there are none
  async findCenter(tx = db) {
    const { rows: [center] } = await tx.execute(sql`
      SELECT ST_Y(c) AS latitude, ST_X(c) AS longitude
      FROM (
        SELECT ST_Centroid(ST_Collect(polygon::geometry)) AS c
        FROM zones
        WHERE deleted_at IS NULL
      ) centroid
      WHERE c IS NOT NULL`);

    return center ?? null;
  },

  // Zone of a point: the smallest active zone that contains it (the most specific one, e.g. a
  // paddock inside a general zone), or null if it is outside every zone
  // Where a point is: the smallest zone that contains it (positions.zone_id), whether it's in the
  // field (inside some general zone) and the exclusion zone it's in (the smallest).
  // hasField: there is some general zone (without one there's no "outside the field").
  async findStatus({ latitude, longitude }, tx = db) {
    const { rows: [row] } = await tx.execute(sql`
      SELECT
        EXISTS (
          SELECT 1 FROM zones g JOIN zone_types gt ON gt.id = g.zone_type_id
          WHERE g.deleted_at IS NULL AND gt.name = 'general'
        ) AS has_field,
        (array_agg(z.id ORDER BY ST_Area(z.polygon), z.id))[1] AS zone_id,
        COALESCE(bool_or(t.name = 'general'), false) AS in_field,
        (array_agg(z.id ORDER BY ST_Area(z.polygon), z.id) FILTER (WHERE t.name = 'exclusion'))[1]
          AS exclusion_zone_id
      FROM zones z
      JOIN zone_types t ON t.id = z.zone_type_id
      WHERE z.deleted_at IS NULL
        AND ST_Covers(z.polygon, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography)`);

    return {
      zoneId: row.zone_id,
      hasField: row.has_field,
      inField: row.in_field,
      exclusionZoneId: row.exclusion_zone_id,
    };
  },

  // Self-intersecting polygons are not valid
  async isValidPolygon(points, tx = db) {
    const wkt = zones.points.mapToDriverValue(points);

    const result = await tx.execute(
      sql`SELECT ST_IsValid(ST_GeomFromEWKT(${wkt})) AS valid`,
    );

    return result.rows[0].valid;
  },

  async create(zone, tx = db) {
    const [created] = await tx
      .insert(zones)
      .values(zone)
      .returning();

    return created;
  },

  async update(id, values, tx = db) {
    const [updated] = await tx
      .update(zones)
      .set(values)
      .where(and(
        eq(zones.id, id),
        isNull(zones.deletedAt),
      ))
      .returning();

    return updated ?? null;
  },

  async delete(id, tx = db) {
    const now = new Date();

    const [deleted] = await tx
      .update(zones)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(zones.id, id),
        isNull(zones.deletedAt),
      ))
      .returning();

    return deleted ?? null;
  },

};

export default zoneRepository;
