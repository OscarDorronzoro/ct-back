import { z } from 'zod';

// Historical forecast API: the same model data as the forecast API, archived, for any range of
// dates up to the latest run. The forecast API (past_days) only has about 2 months of past data
// here: older hours come back with every value null.
const HISTORICAL_URL = 'https://historical-forecast-api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 30 * 1000;

// Requested hourly variables -> observation field
const VARIABLES = {
  temperature_2m: 'temperature',
  apparent_temperature: 'apparentTemperature',
  relative_humidity_2m: 'relativeHumidity',
  precipitation: 'precipitation',
  weather_code: 'weatherCode',
  cloud_cover: 'cloudCover',
  pressure_msl: 'pressure',
  wind_speed_10m: 'windSpeed',
  wind_gusts_10m: 'windGusts',
  wind_direction_10m: 'windDirection',
};

const series = z.array(z.number().nullable());

const responseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  hourly: z.object({
    time: z.array(z.number().int()),
    ...Object.fromEntries(Object.keys(VARIABLES).map((name) => [name, series])),
  }),
});

// Hourly series to one object per hour (time in UTC, unix seconds -> Date)
export function toHourlyRows(data) {
  const { hourly } = data;

  return hourly.time.map((unixTime, index) => ({
    observedAt: new Date(unixTime * 1000),
    latitude: data.latitude,
    longitude: data.longitude,
    ...Object.fromEntries(Object.entries(VARIABLES)
      .map(([name, field]) => [field, hourly[name][index] ?? null])),
  }));
}

// Hourly weather of the days from startDate to endDate (YYYY-MM-DD, UTC), as validated rows
async function fetchHourly({
  latitude, longitude, startDate, endDate,
}) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: Object.keys(VARIABLES).join(','),
    start_date: startDate,
    end_date: endDate,
    timezone: 'GMT',
    timeformat: 'unixtime',
  });

  const response = await fetch(`${HISTORICAL_URL}?${params}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo responded ${response.status}: ${await response.text()}`);
  }

  return toHourlyRows(responseSchema.parse(await response.json()));
}

export default { fetchHourly };
