import {
  and, gte, lt, asc, desc, max, sql,
} from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import weatherObservations from './weatherObservation.schema';

// Columns refreshed when an hour comes again (the provider corrects recent hours)
const UPDATABLE = [
  'latitude', 'longitude', 'temperature', 'apparentTemperature', 'relativeHumidity',
  'precipitation', 'weatherCode', 'cloudCover', 'pressure', 'windSpeed', 'windGusts',
  'windDirection', 'source', 'fetchedAt',
];

const weatherRepository = {

  async findLastObservedAt(tx = db) {
    const [{ last }] = await tx
      .select({ last: max(weatherObservations.observedAt) })
      .from(weatherObservations);

    return last ?? null;
  },

  // Insert or update by hour
  async upsertMany(rows, tx = db) {
    if (rows.length === 0) {
      return 0;
    }

    const set = Object.fromEntries(UPDATABLE.map((field) => {
      const column = weatherObservations[field].name;
      return [field, sql.raw(`excluded.${column}`)];
    }));

    const result = await tx
      .insert(weatherObservations)
      .values(rows)
      .onConflictDoUpdate({ target: weatherObservations.observedAt, set });

    return result.rowCount;
  },

  // Hours in [dateFrom, dateTo), oldest first
  async findInRange({ dateFrom, dateTo }, tx = db) {
    return tx
      .select()
      .from(weatherObservations)
      .where(and(
        gte(weatherObservations.observedAt, dateFrom),
        lt(weatherObservations.observedAt, dateTo),
      ))
      .orderBy(asc(weatherObservations.observedAt));
  },

  async findLatest(tx = db) {
    const [result] = await tx
      .select()
      .from(weatherObservations)
      .orderBy(desc(weatherObservations.observedAt))
      .limit(1);

    return result ?? null;
  },
};

export default weatherRepository;
