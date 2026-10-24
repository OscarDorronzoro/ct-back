import {
  pgSchema, integer, varchar, real, date, timestamp, boolean, jsonb, primaryKey,
} from 'drizzle-orm/pg-core';
import geographyPoint from '../../shared/db/types/geographyPoint';

// Light data warehouse: facts (fact_*) and dimensions (dim_*) computed from the operational tables
// by the dw refresh job. Read by the explorer; nothing else writes here.
export const dw = pgSchema('dw');

const ts = (name) => timestamp(name, { withTimezone: true, mode: 'date' });

export const dimDate = dw.table('dim_date', {
  dateKey: date('date_key', { mode: 'string' }).primaryKey(),
  year: integer().notNull(),
  quarter: integer().notNull(),
  month: integer().notNull(),
  isoYear: integer('iso_year').notNull(),
  isoWeek: integer('iso_week').notNull(),
  dayOfMonth: integer('day_of_month').notNull(),
  // 1 Monday ... 7 Sunday
  dayOfWeek: integer('day_of_week').notNull(),
});

export const dimCow = dw.table('dim_cow', {
  cowId: integer('cow_id').primaryKey(),
  earTag: varchar('ear_tag'),
  alias: varchar(),
  sex: varchar(),
  breedId: integer('breed_id'),
  breedName: varchar('breed_name'),
  birthDate: date('birth_date', { mode: 'string' }),
  deleted: boolean().notNull(),
});

export const dimCategory = dw.table('dim_category', {
  categoryId: integer('category_id').primaryKey(),
  name: varchar().notNull(),
  sex: varchar().notNull(),
});

export const dimCollar = dw.table('dim_collar', {
  collarId: integer('collar_id').primaryKey(),
  code: integer(),
  description: varchar(),
  firmwareVersion: varchar('firmware_version'),
  deleted: boolean().notNull(),
});

export const dimZone = dw.table('dim_zone', {
  zoneId: integer('zone_id').primaryKey(),
  name: varchar(),
  zoneType: varchar('zone_type'),
  areaM2: real('area_m2'),
  deleted: boolean().notNull(),
});

// Stop of a cow: positions within the stop radius (see track.util)
export const factStop = dw.table('fact_stop', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  cowId: integer('cow_id').notNull(),
  startedAt: ts('started_at').notNull(),
  endedAt: ts('ended_at').notNull(),
  durationMin: real('duration_min').notNull(),
  center: geographyPoint().notNull(),
  zoneId: integer('zone_id'),
  positions: integer().notNull(),
});

export const factZoneVisit = dw.table('fact_zone_visit', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  cowId: integer('cow_id').notNull(),
  zoneId: integer('zone_id').notNull(),
  enteredAt: ts('entered_at').notNull(),
  leftAt: ts('left_at').notNull(),
  durationMin: real('duration_min').notNull(),
  positions: integer().notNull(),
});

export const factDailyActivity = dw.table('fact_daily_activity', {
  dateKey: date('date_key', { mode: 'string' }).notNull(),
  cowId: integer('cow_id').notNull(),
  // Category of the cow at the end of the day (cow_category_assignments)
  categoryId: integer('category_id'),
  positions: integer().notNull(),
  // Sum of the distances between positions, GPS noise included
  rawDistanceM: real('raw_distance_m').notNull(),
  // Without the noise of the stops (track.util)
  distanceM: real('distance_m').notNull(),
  movingMin: real('moving_min').notNull(),
  restingMin: real('resting_min').notNull(),
}, (table) => [primaryKey({ columns: [table.dateKey, table.cowId] })]);

// Weather of each day of the farm (from the hourly weather_observations)
export const factDailyWeather = dw.table('fact_daily_weather', {
  dateKey: date('date_key', { mode: 'string' }).primaryKey(),
  temperatureMin: real('temperature_min'),
  temperatureMax: real('temperature_max'),
  temperatureAvg: real('temperature_avg'),
  precipitationMm: real('precipitation_mm'),
  humidityAvg: real('humidity_avg'),
  windMaxKmh: real('wind_max_kmh'),
  gustMaxKmh: real('gust_max_kmh'),
  hours: integer().notNull(),
});

// Sanitary events that weren't voided, flattened
export const factHealthEvent = dw.table('fact_health_event', {
  eventId: integer('event_id').primaryKey(),
  cowId: integer('cow_id').notNull(),
  dateKey: date('date_key', { mode: 'string' }).notNull(),
  occurredAt: ts('occurred_at').notNull(),
  type: varchar().notNull(),
  productId: integer('product_id'),
  productName: varchar('product_name'),
  productType: varchar('product_type'),
  weightKg: real('weight_kg'),
  temperature: real(),
  bodyCondition: real('body_condition'),
});

// Battery of each collar per day of the farm, from the voltage readings of its messages.
// The reference is the dawn voltage (3 to 5 am of the farm): the battery at rest and without sun.
// During the day the solar panel pushes the voltage up and it says little of the charge.
// percent: estimate from the dawn voltage (or the median of the day, without dawn readings) with
// the discharge curve of devices/battery.util.
export const factBatteryDaily = dw.table('fact_battery_daily', {
  dateKey: date('date_key', { mode: 'string' }).notNull(),
  collarId: integer('collar_id').notNull(),
  // Cow wearing the collar at the end of the day
  cowId: integer('cow_id'),
  readings: integer().notNull(),
  voltageMin: real('voltage_min').notNull(),
  voltageMedian: real('voltage_median').notNull(),
  voltageMax: real('voltage_max').notNull(),
  voltageDawn: real('voltage_dawn'),
  // Against the dawn of the previous day: > 0, the panel put back more than the collar used
  voltageDawnChange: real('voltage_dawn_change'),
  percent: integer().notNull(),
}, (table) => [primaryKey({ columns: [table.dateKey, table.collarId] })]);

// Vegetation index of each zone on each date with a usable satellite image (zone_ndvi_observations)
export const factZoneNdvi = dw.table('fact_zone_ndvi', {
  dateKey: date('date_key', { mode: 'string' }).notNull(),
  zoneId: integer('zone_id').notNull(),
  ndviMean: real('ndvi_mean').notNull(),
  ndviMin: real('ndvi_min').notNull(),
  ndviMax: real('ndvi_max').notNull(),
  validFraction: real('valid_fraction').notNull(),
}, (table) => [primaryKey({ columns: [table.dateKey, table.zoneId] })]);

export const etlRuns = dw.table('etl_runs', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  startedAt: ts('started_at').notNull(),
  finishedAt: ts('finished_at'),
  stats: jsonb(),
  error: varchar(),
});
