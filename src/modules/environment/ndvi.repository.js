import { eq, max, sql } from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import zoneNdviObservations from './zoneNdvi.schema';

// Zone types where the pasture is watched
export const NDVI_ZONE_TYPES = ['potrero', 'general'];

const ndviRepository = {
  // Active zones of NDVI_ZONE_TYPES, with their polygon projected to the UTM zone that contains
  // them (meters, for 10 m pixels): [{ id, name, epsg, geometry (GeoJSON), areaM2 }]
  async findZones(tx = db) {
    const { rows } = await tx.execute(sql`
      WITH z AS (
        SELECT z.id, z.name, z.polygon::geometry AS g
        FROM zones z JOIN zone_types t ON t.id = z.zone_type_id
        WHERE z.deleted_at IS NULL AND t.name IN (${sql.join(NDVI_ZONE_TYPES.map((t) => sql`${t}`), sql`, `)})
      ), utm AS (
        SELECT id, name, g,
          (CASE WHEN ST_Y(ST_Centroid(g)) < 0 THEN 32700 ELSE 32600 END
            + floor((ST_X(ST_Centroid(g)) + 180) / 6)::int + 1) AS epsg
        FROM z
      )
      SELECT id, name, epsg, ST_AsGeoJSON(ST_Transform(g, epsg))::json AS geometry,
        ST_Area(ST_Transform(g, epsg)) AS area_m2
      FROM utm
      ORDER BY id`);

    return rows.map(({ area_m2: areaM2, ...zone }) => ({ ...zone, areaM2 }));
  },

  async findLastAcquiredOn(zoneId, tx = db) {
    const [{ last }] = await tx
      .select({ last: max(zoneNdviObservations.acquiredOn) })
      .from(zoneNdviObservations)
      .where(eq(zoneNdviObservations.zoneId, zoneId));

    return last ?? null;
  },

  // Insert or update by zone and date (an image can be reprocessed)
  async upsertMany(rows, tx = db) {
    if (rows.length === 0) {
      return 0;
    }

    const updatable = ['ndviMean', 'ndviMin', 'ndviMax', 'ndviStdev', 'validFraction', 'pixels', 'source', 'fetchedAt'];
    const set = Object.fromEntries(updatable.map((field) => [
      field, sql.raw(`excluded.${zoneNdviObservations[field].name}`),
    ]));

    const result = await tx
      .insert(zoneNdviObservations)
      .values(rows)
      .onConflictDoUpdate({
        target: [zoneNdviObservations.zoneId, zoneNdviObservations.acquiredOn],
        set,
      });

    return result.rowCount;
  },
};

export default ndviRepository;
