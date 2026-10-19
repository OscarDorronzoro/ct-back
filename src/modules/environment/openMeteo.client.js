import { z } from 'zod';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 15 * 1000;

// Open-Meteo accepts up to 92 past days on the forecast API
export const MAX_PAST_DAYS = 92;

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

// Hourly weather from `pastDays` ago until the end of today, as validated rows
async function fetchHourly({ latitude, longitude, pastDays }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: Object.keys(VARIABLES).join(','),
    past_days: String(pastDays),
    forecast_days: '1',
    timezone: 'GMT',
    timeformat: 'unixtime',
  });

  const response = await fetch(`${FORECAST_URL}?${params}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo responded ${response.status}: ${await response.text()}`);
  }

  return toHourlyRows(responseSchema.parse(await response.json()));
}

export default { fetchHourly };
