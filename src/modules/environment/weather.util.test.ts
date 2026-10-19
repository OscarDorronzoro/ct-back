import { describe, it, expect } from 'vitest';

import { pastDaysToFetch, completedHours } from './weather.util';
import { toHourlyRows } from './openMeteo.client';

const now = new Date('2026-10-19T12:30:00Z');
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3600 * 1000);

describe('pastDaysToFetch', () => {
  it('goes as far back as allowed when nothing is stored', () => {
    expect(pastDaysToFetch(null, now)).toBe(92);
  });

  it.each([
    [1, 2],
    [24, 2],
    [25, 3],
    [24 * 10, 11],
  ])('last stored %i h ago -> %i days', (hours, days) => {
    expect(pastDaysToFetch(hoursAgo(hours), now)).toBe(days);
  });

  it('is capped at 92 days', () => {
    expect(pastDaysToFetch(hoursAgo(24 * 200), now)).toBe(92);
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

describe('completedHours', () => {
  it('drops the hours still to come', () => {
    const rows = [hoursAgo(1), now, hoursAgo(-1)].map((observedAt) => ({ observedAt }));

    expect(completedHours(rows, now)).toEqual(rows.slice(0, 2));
  });
});
