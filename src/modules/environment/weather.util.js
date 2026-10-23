const DAY_MS = 24 * 3600 * 1000;

// History loaded on the first sync
export const INITIAL_DAYS = 92;

const WEATHER_FIELDS = [
  'temperature', 'apparentTemperature', 'relativeHumidity', 'precipitation', 'weatherCode',
  'cloudCover', 'pressure', 'windSpeed', 'windGusts', 'windDirection',
];

const utcDate = (date) => date.toISOString().slice(0, 10);

// Days to ask for so the stored series has no gaps (YYYY-MM-DD, UTC): from the day before the last
// stored hour (recent hours get the provider's corrections), or INITIAL_DAYS back if there is none,
// until today.
export function fetchRange(lastObservedAt, now) {
  const start = lastObservedAt
    ? new Date(lastObservedAt.getTime() - DAY_MS)
    : new Date(now.getTime() - INITIAL_DAYS * DAY_MS);

  return { startDate: utcDate(start), endDate: utcDate(now) };
}

// Hours worth storing: already over (the rest is forecast) and with some data (the provider may
// not have an hour yet: every value null)
export function storableHours(rows, now) {
  return rows.filter((row) => row.observedAt <= now
    && WEATHER_FIELDS.some((field) => row[field] !== null));
}
