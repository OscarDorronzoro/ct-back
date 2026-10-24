import {
  and, eq, gte, sql,
} from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import {
  factStop, factZoneVisit, factDailyActivity, factBatteryDaily, etlRuns,
} from './dw.schema';
import { FARM_TIMEZONE } from './analytics.constants';

const TZ = FARM_TIMEZONE;
const BATCH = 1000;

// Insert in batches, one after the other (a first load can have tens of thousands of rows)
function insertBatches(table, rows, tx) {
  const batches = Array.from(
    { length: Math.ceil(rows.length / BATCH) },
    (_, i) => rows.slice(i * BATCH, (i + 1) * BATCH),
  );

  return batches.reduce(
    (previous, batch) => previous.then(() => tx.insert(table).values(batch)),
    Promise.resolve(),
  );
}

const dwRepository = {
  async cowIdsWithPositions(tx = db) {
    const { rows } = await tx.execute(sql`SELECT DISTINCT cow_id FROM positions ORDER BY cow_id`);
    return rows.map((row) => row.cow_id);
  },

  // First day to recompute for a cow: yesterday (late positions arrive), or the day after its last
  // computed day if the job stopped for a while, or its first position on the first load.
  // Returns { day: 'YYYY-MM-DD', start: Date (midnight of the farm) } or null without positions.
  async refreshDay(cowId, tx = db) {
    const { rows: [row] } = await tx.execute(sql`
      WITH last AS (SELECT max(date_key) AS day FROM dw.fact_daily_activity WHERE cow_id = ${cowId}),
      first AS (
        SELECT (min(recorded_at) AT TIME ZONE ${TZ})::date AS day FROM positions WHERE cow_id = ${cowId}
      ),
      d AS (
        SELECT CASE
          WHEN last.day IS NOT NULL THEN least(((now() AT TIME ZONE ${TZ})::date - 1), last.day)
          ELSE first.day
        END AS day
        FROM last, first
      )
      SELECT to_char(day, 'YYYY-MM-DD') AS day, (day::timestamp AT TIME ZONE ${TZ}) AS start
      FROM d WHERE day IS NOT NULL`);

    return row ? { day: row.day, start: new Date(row.start) } : null;
  },

  // Earliest start of a stop or zone visit of the cow that goes on past `at` (or null): recomputing
  // from `at` would cut it in two
  async crossingStart(cowId, at, tx = db) {
    const { rows: [row] } = await tx.execute(sql`
      SELECT least(
        (SELECT min(started_at) FROM dw.fact_stop
         WHERE cow_id = ${cowId} AND started_at < ${at} AND ended_at >= ${at}),
        (SELECT min(entered_at) FROM dw.fact_zone_visit
         WHERE cow_id = ${cowId} AND entered_at < ${at} AND left_at >= ${at})
      ) AS start`);

    return row.start ? new Date(row.start) : null;
  },

  async positionsFrom(cowId, from, tx = db) {
    const { rows } = await tx.execute(sql`
      SELECT id, recorded_at, ST_Y(location::geometry) AS latitude,
        ST_X(location::geometry) AS longitude, accuracy, zone_id, distance_to_previous
      FROM positions
      WHERE cow_id = ${cowId} AND recorded_at >= ${from}
      ORDER BY recorded_at, id`);

    return rows.map((r) => ({
      id: Number(r.id),
      recordedAt: new Date(r.recorded_at),
      latitude: r.latitude,
      longitude: r.longitude,
      accuracy: r.accuracy,
      zoneId: r.zone_id,
      distanceToPrevious: r.distance_to_previous,
    }));
  },

  // Replaces the facts of a cow from `from` (stops, visits) and `day` (daily activity)
  async replaceCowFacts(cowId, {
    from, day, stops, visits, days,
  }, tx) {
    await tx.delete(factStop).where(and(eq(factStop.cowId, cowId), gte(factStop.startedAt, from)));
    await tx.delete(factZoneVisit)
      .where(and(eq(factZoneVisit.cowId, cowId), gte(factZoneVisit.enteredAt, from)));
    await tx.delete(factDailyActivity)
      .where(and(eq(factDailyActivity.cowId, cowId), gte(factDailyActivity.dateKey, day)));

    await insertBatches(factStop, stops, tx);
    await insertBatches(factZoneVisit, visits, tx);
    await insertBatches(factDailyActivity, days, tx);

    // Category of the cow at the end of each day
    await tx.execute(sql`
      UPDATE dw.fact_daily_activity f
      SET category_id = (
        SELECT a.category_id FROM cow_category_assignments a
        WHERE a.cow_id = f.cow_id
          AND a.date_from < ((f.date_key + 1)::timestamp AT TIME ZONE ${TZ})
          AND (a.date_to IS NULL OR a.date_to >= ((f.date_key + 1)::timestamp AT TIME ZONE ${TZ}))
        ORDER BY a.date_from DESC
        LIMIT 1
      )
      WHERE f.cow_id = ${cowId} AND f.date_key >= ${day}`);
  },

  // Small tables, rebuilt whole on each run: dimensions, daily weather, sanitary events
  async rebuildShared(tx) {
    await tx.execute(sql`
      INSERT INTO dw.dim_date
      SELECT d::date, extract(year FROM d), extract(quarter FROM d), extract(month FROM d),
        extract(isoyear FROM d), extract(week FROM d), extract(day FROM d), extract(isodow FROM d)
      FROM generate_series(
        coalesce(least(
          (SELECT (min(recorded_at) AT TIME ZONE ${TZ})::date FROM positions),
          (SELECT (min(observed_at) AT TIME ZONE ${TZ})::date FROM weather_observations),
          (SELECT (min(occurred_at) AT TIME ZONE ${TZ})::date FROM animal_events)
        ), (now() AT TIME ZONE ${TZ})::date),
        (now() AT TIME ZONE ${TZ})::date,
        interval '1 day') AS d
      ON CONFLICT (date_key) DO NOTHING`);

    await tx.execute(sql`DELETE FROM dw.dim_cow`);
    await tx.execute(sql`
      INSERT INTO dw.dim_cow
      SELECT c.id, c.ear_tag, c.alias, c.sex, c.breed_id, b.name, c.birth_date::date,
        c.deleted_at IS NOT NULL
      FROM cows c LEFT JOIN breeds b ON b.id = c.breed_id`);

    await tx.execute(sql`DELETE FROM dw.dim_category`);
    await tx.execute(sql`INSERT INTO dw.dim_category SELECT id, name, sex FROM categories`);

    await tx.execute(sql`DELETE FROM dw.dim_collar`);
    await tx.execute(sql`
      INSERT INTO dw.dim_collar
      SELECT id, code, description, firmware_version, deleted_at IS NOT NULL FROM collars`);

    await tx.execute(sql`DELETE FROM dw.dim_zone`);
    await tx.execute(sql`
      INSERT INTO dw.dim_zone
      SELECT z.id, z.name, t.name, ST_Area(z.polygon), z.deleted_at IS NOT NULL
      FROM zones z JOIN zone_types t ON t.id = z.zone_type_id`);

    // observed_at is the end of the hour: the hour belongs to the day it started
    await tx.execute(sql`DELETE FROM dw.fact_daily_weather`);
    await tx.execute(sql`
      INSERT INTO dw.fact_daily_weather
      SELECT ((observed_at - interval '1 hour') AT TIME ZONE ${TZ})::date,
        min(temperature), max(temperature), avg(temperature), sum(precipitation),
        avg(relative_humidity), max(wind_speed), max(wind_gusts), count(*)
      FROM weather_observations
      GROUP BY 1`);

    await tx.execute(sql`DELETE FROM dw.fact_zone_ndvi`);
    await tx.execute(sql`
      INSERT INTO dw.fact_zone_ndvi
      SELECT acquired_on, zone_id, ndvi_mean, ndvi_min, ndvi_max, valid_fraction
      FROM zone_ndvi_observations`);

    await tx.execute(sql`DELETE FROM dw.fact_health_event`);
    await tx.execute(sql`
      INSERT INTO dw.fact_health_event
      SELECT e.id, e.cow_id, (e.occurred_at AT TIME ZONE ${TZ})::date, e.occurred_at, e.type,
        p.id, p.name, p.type, w.weight_kg, x.temperature, x.body_condition
      FROM animal_events e
      LEFT JOIN vaccinations v ON v.event_id = e.id
      LEFT JOIN treatments t ON t.event_id = e.id
      LEFT JOIN products p ON p.id = coalesce(v.product_id, t.product_id)
      LEFT JOIN weighings w ON w.event_id = e.id
      LEFT JOIN examinations x ON x.event_id = e.id
      WHERE e.voided_at IS NULL`);
  },

  // First day of battery to recompute: yesterday, or the day after the last one computed, or the
  // first reading on the first load ('YYYY-MM-DD', or null without readings)
  async batteryRefreshDay(tx = db) {
    const { rows: [row] } = await tx.execute(sql`
      SELECT to_char(CASE
        WHEN (SELECT max(date_key) FROM dw.fact_battery_daily) IS NOT NULL
          THEN least(((now() AT TIME ZONE ${TZ})::date - 1), (SELECT max(date_key) FROM dw.fact_battery_daily))
        ELSE (SELECT (min(recorded_at) AT TIME ZONE ${TZ})::date FROM raw_rf_messages WHERE voltage IS NOT NULL)
      END, 'YYYY-MM-DD') AS day`);

    return row.day;
  },

  // Voltage per collar and day of the farm from `day`. The messages carry the LoRa code of the
  // collar; readings outside 2..5 V are not battery (same rule as the processing job), and frames
  // that failed the integrity check don't count.
  async batteryDailyFrom(day, tx = db) {
    const { rows } = await tx.execute(sql`
      WITH daily AS (
        SELECT (r.recorded_at AT TIME ZONE ${TZ})::date AS day,
          c.id AS collar_id,
          count(*)::int AS readings,
          min(r.voltage) AS voltage_min,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY r.voltage) AS voltage_median,
          max(r.voltage) AS voltage_max,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY r.voltage) FILTER (
            WHERE extract(hour FROM r.recorded_at AT TIME ZONE ${TZ}) BETWEEN 3 AND 4
          ) AS voltage_dawn
        FROM raw_rf_messages r
        JOIN collars c ON c.code = r.collar_code
        WHERE r.recorded_at >= (${day}::date::timestamp AT TIME ZONE ${TZ})
          AND r.voltage BETWEEN 2 AND 5
          AND (r.integrity IS NULL OR r.integrity = 'ok')
        GROUP BY 1, 2
      )
      SELECT to_char(d.day, 'YYYY-MM-DD') AS date_key, d.collar_id, d.readings,
        d.voltage_min, d.voltage_median, d.voltage_max, d.voltage_dawn,
        d.voltage_dawn - coalesce(
          (SELECT p.voltage_dawn FROM daily p WHERE p.collar_id = d.collar_id AND p.day = d.day - 1),
          (SELECT f.voltage_dawn FROM dw.fact_battery_daily f
           WHERE f.collar_id = d.collar_id AND f.date_key = d.day - 1)
        ) AS voltage_dawn_change,
        (SELECT a.cow_id FROM cow_collar_assignments a
         WHERE a.collar_id = d.collar_id
           AND a.date_from < ((d.day + 1)::timestamp AT TIME ZONE ${TZ})
           AND (a.date_to IS NULL OR a.date_to >= ((d.day + 1)::timestamp AT TIME ZONE ${TZ}))
         ORDER BY a.date_from DESC LIMIT 1) AS cow_id
      FROM daily d`);

    return rows;
  },

  async replaceBatteryDaily(day, rows, tx) {
    await tx.delete(factBatteryDaily).where(gte(factBatteryDaily.dateKey, day));
    await insertBatches(factBatteryDaily, rows, tx);
  },

  async startRun(tx = db) {
    const [run] = await tx.insert(etlRuns).values({ startedAt: new Date() }).returning();
    return run.id;
  },

  async finishRun(id, { stats = null, error = null }, tx = db) {
    await tx
      .update(etlRuns)
      .set({ finishedAt: new Date(), stats, error })
      .where(eq(etlRuns.id, id));
  },
};

export default dwRepository;
