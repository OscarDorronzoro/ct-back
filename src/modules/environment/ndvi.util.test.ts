import { describe, it, expect } from 'vitest';

import { fetchRanges, toObservations } from './ndvi.util';

const now = new Date('2026-10-24T12:00:00Z');
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('fetchRanges', () => {
  it('goes back a year, in chunks of 90 days, until tomorrow', () => {
    const ranges = fetchRanges(null, now);

    expect(ranges[0].from).toEqual(day('2025-10-24'));
    expect(ranges.at(-1)?.to).toEqual(day('2026-10-25'));
    expect(ranges).toHaveLength(5);
    ranges.slice(1).forEach((r, i) => expect(r.from).toEqual(ranges[i].to));
  });

  it('looks 15 days back from the last image', () => {
    expect(fetchRanges('2026-10-20', now)).toEqual([{ from: day('2026-10-05'), to: day('2026-10-25') }]);
  });
});

const interval = (date: string, stats: object | null) => ({
  interval: { from: `${date}T00:00:00Z`, to: `${date}T23:59:59Z` },
  outputs: stats ? { ndvi: { bands: { B0: { stats } } } } : undefined,
});

// A zone of 10 ha: 1000 pixels of 10 m, inside a box of 1600 pixels (the rest is no data)
const ZONE_M2 = 100000;

describe('toObservations', () => {
  it('keeps the images where most of the zone was seen clear', () => {
    const observations = toObservations([
      interval('2026-10-01', {
        min: 0.2, max: 0.8, mean: 0.61, stDev: 0.07, sampleCount: 1600, noDataCount: 700,
      }),
      interval('2026-10-06', {
        min: 0.1, max: 0.5, mean: 0.3, stDev: 0.1, sampleCount: 1600, noDataCount: 1300,
      }),
    ], ZONE_M2);

    expect(observations).toEqual([{
      acquiredOn: '2026-10-01',
      ndviMean: 0.61,
      ndviMin: 0.2,
      ndviMax: 0.8,
      ndviStdev: 0.07,
      validFraction: 0.9,
      pixels: 900,
    }]);
  });

  it('skips days without an image or without numbers', () => {
    expect(toObservations([
      interval('2026-10-02', null),
      interval('2026-10-03', { mean: 'NaN', sampleCount: 1000, noDataCount: 0 }),
      interval('2026-10-04', { sampleCount: 0 }),
    ], ZONE_M2)).toEqual([]);
  });
});
