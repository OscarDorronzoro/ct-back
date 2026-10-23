import { describe, it, expect } from 'vitest';

import { fetchRange, storableHours } from './weather.util';
import { toHourlyRows } from './openMeteo.client';

const now = new Date('2026-10-19T12:30:00Z');
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3600 * 1000);

describe('fetchRange', () => {
  it('goes back 92 days when nothing is stored', () => {
    expect(fetchRange(null, now)).toEqual({ startDate: '2026-07-19', endDate: '2026-10-19' });
  });

  it('starts the day before the last stored hour', () => {
    expect(fetchRange(hoursAgo(1), now)).toEqual({ startDate: '2026-10-18', endDate: '2026-10-19' });
    expect(fetchRange(hoursAgo(24 * 10), now)).toEqual({ startDate: '2026-10-08', endDate: '2026-10-19' });
  });
});

describe('toHourlyRows', () => {
  it('turns the hourly series into one row per hour', () => {
    const rows = toHourlyRows({
      latitude: -33.0,
      longitude: -61.2,
      hourly: {
        time: [1792281600, 1792285200],
        temperature_2m: [10.2, 9.4],
        apparent_temperature: [7.4, 6.9],
        relative_humidity_2m: [70, 74],
        precipitation: [0, 0.4],
        weather_code: [0, 61],
        cloud_cover: [1, 90],
        pressure_msl: [1022.7, 1023.1],
        wind_speed_10m: [10.4, null],
        wind_gusts_10m: [18.7, 17.6],
        wind_direction_10m: [126, 129],
      },
    });

    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({
      observedAt: new Date(1792285200 * 1000),
      latitude: -33.0,
      longitude: -61.2,
      temperature: 9.4,
      apparentTemperature: 6.9,
      relativeHumidity: 74,
      precipitation: 0.4,
      weatherCode: 61,
      cloudCover: 90,
      pressure: 1023.1,
      windSpeed: null,
      windGusts: 17.6,
      windDirection: 129,
    });
  });
});

describe('storableHours', () => {
  const hour = (observedAt: Date, temperature: number | null) => ({
    observedAt,
    temperature,
    apparentTemperature: null,
    relativeHumidity: null,
    precipitation: null,
    weatherCode: null,
    cloudCover: null,
    pressure: null,
    windSpeed: null,
    windGusts: null,
    windDirection: null,
  });

  it('drops the hours still to come', () => {
    const rows = [hour(hoursAgo(1), 10), hour(now, 11), hour(hoursAgo(-1), 12)];

    expect(storableHours(rows, now)).toEqual(rows.slice(0, 2));
  });

  it('drops hours without any data', () => {
    const rows = [hour(hoursAgo(2), null), hour(hoursAgo(1), 10)];

    expect(storableHours(rows, now)).toEqual([rows[1]]);
  });
});
