import {
  pgTable, integer, smallint, real, varchar, timestamp,
} from 'drizzle-orm/pg-core';

// Hourly weather at the farm, from an external provider (Open-Meteo).
// One row per hour: observed_at is the end of the hour (precipitation is the sum of that hour).
const weatherObservations = pgTable('weather_observations', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  observedAt: timestamp('observed_at', { withTimezone: true, mode: 'date' }).notNull().unique(),
  // Grid point the provider used, near the center of the zones
  latitude: real().notNull(),
  longitude: real().notNull(),
  // °C, at 2 m
  temperature: real(),
  apparentTemperature: real('apparent_temperature'),
  // %
  relativeHumidity: smallint('relative_humidity'),
  // mm in the hour
  precipitation: real(),
  // WMO weather interpretation code (0 clear sky, 61 rain, 95 thunderstorm...)
  weatherCode: smallint('weather_code'),
  // %
  cloudCover: smallint('cloud_cover'),
  // hPa, at sea level
  pressure: real(),
  // km/h at 10 m; direction in degrees the wind comes from
  windSpeed: real('wind_speed'),
  windGusts: real('wind_gusts'),
  windDirection: smallint('wind_direction'),
  source: varchar().notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export default weatherObservations;
