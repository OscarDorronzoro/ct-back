import { describe, it, expect } from 'vitest';

import {
  buildTrack, dailyActivity, zoneVisits, MAX_GAP_MS,
} from './track.util';

const ORIGIN = { latitude: -33.0, longitude: -61.2 };
const MIN = 60 * 1000;
const T0 = new Date('2026-10-20T10:00:00Z').getTime();

// Point x meters east and y meters north of the origin, `minute` minutes after T0
const at = (minute: number, x: number, y = 0, extra = {}) => ({
  recordedAt: new Date(T0 + minute * MIN),
  latitude: ORIGIN.latitude + y / 111320,
  longitude: ORIGIN.longitude + x / (111320 * Math.cos((ORIGIN.latitude * Math.PI) / 180)),
  accuracy: 5,
  zoneId: 1,
  distanceToPrevious: 0,
  ...extra,
});

// Jitter of a quiet collar: up to ~15 m around the origin, every 6 minutes
const JITTER = [[0, 0], [8, -5], [-12, 6], [5, 14], [-7, -10], [13, 3], [-4, 9], [10, -12]];
const quiet = (fromMinute: number, count: number, cx = 0, cy = 0) => Array.from(
  { length: count },
  (_, i) => {
    const [dx, dy] = JITTER[i % JITTER.length];
    return at(fromMinute + i * 6, cx + dx, cy + dy);
  },
);

type Track = ReturnType<typeof buildTrack>;
const meters = (track: Track) => track.steps.reduce((sum, s) => sum + s.meters, 0);

describe('buildTrack', () => {
  it('makes one stop of a quiet collar, without distance', () => {
    const track = buildTrack(quiet(0, 20));

    expect(track.stops).toHaveLength(1);
    expect(track.stops[0]).toMatchObject({ positions: 20, zoneId: 1 });
    expect(meters(track)).toBe(0);
  });

  it('ignores a single GPS jump', () => {
    const points = [...quiet(0, 5), at(30, 70, 0), ...quiet(36, 5)];
    const track = buildTrack(points);

    expect(track.stops).toHaveLength(1);
    expect(meters(track)).toBe(0);
  });

  it('measures a walk', () => {
    const walk = Array.from({ length: 11 }, (_, i) => at(i * 6, i * 50));

    expect(meters(buildTrack(walk))).toBeCloseTo(500, -1);
  });

  it('ends a stop on a long gap, without distance if the cow is in the same place', () => {
    const gap = MAX_GAP_MS / MIN + 10;
    const points = [...quiet(0, 5), ...quiet(24 + gap, 5)];
    const track = buildTrack(points);

    expect(track.stops).toHaveLength(2);
    expect(meters(track)).toBe(0);
  });

  it('counts the straight line when the cow shows up elsewhere after a gap', () => {
    const gap = MAX_GAP_MS / MIN + 10;
    const points = [...quiet(0, 5), ...quiet(24 + gap, 5, 300)];

    expect(meters(buildTrack(points))).toBeCloseTo(300, -1);
  });

  it('measures rest, walk, rest from stop to stop', () => {
    const points = [
      ...quiet(0, 6),
      at(36, 100), at(42, 200), at(48, 300),
      ...quiet(54, 6, 400),
    ];
    const track = buildTrack(points);

    expect(track.stops).toHaveLength(2);
    expect(meters(track)).toBeGreaterThan(380);
    expect(meters(track)).toBeLessThan(430);
  });
});

describe('dailyActivity', () => {
  const dateKey = (d: Date) => d.toISOString().slice(0, 10);

  it('splits time into resting and moving, and leaves long gaps out', () => {
    const points = [
      ...quiet(0, 4), // 18 min resting
      at(24, 100), at(30, 200), // 12 min moving
      at(30 + MAX_GAP_MS / MIN + 10, 300), // gap: not counted
    ];
    const [day] = dailyActivity(buildTrack(points).steps, dateKey);

    expect(day).toMatchObject({ positions: 7, restingMinutes: 18, movingMinutes: 12 });
  });

  it('counts each position on its own day', () => {
    const points = [at(0, 0), at(14 * 60, 0), at(14 * 60 + 6, 5)]; // 10:00, 00:00 and 00:06 UTC
    const days = dailyActivity(buildTrack(points).steps, dateKey);

    expect(days.map((d) => [d.dateKey, d.positions])).toEqual([['2026-10-20', 1], ['2026-10-21', 2]]);
  });
});

describe('zoneVisits', () => {
  const inZone = (minute: number, zoneId: number | null) => at(minute, 0, 0, { zoneId });

  it('groups consecutive positions in a zone', () => {
    const visits = zoneVisits([
      inZone(0, 1), inZone(6, 1), inZone(12, 2), inZone(18, 2), inZone(24, 2),
    ]);

    expect(visits.map((v) => [v.zoneId, v.positions])).toEqual([[1, 2], [2, 3]]);
    expect(visits[0].leftAt).toEqual(new Date(T0 + 12 * MIN));
  });

  it('ignores one position across the border', () => {
    const visits = zoneVisits([
      inZone(0, 1), inZone(6, 1), inZone(12, 2), inZone(18, 1), inZone(24, 1),
    ]);

    expect(visits).toHaveLength(1);
    expect(visits[0]).toMatchObject({ zoneId: 1, positions: 5 });
  });

  it('does not count time outside every zone, and ends a visit on a long gap', () => {
    const gapAfter30 = 30 + MAX_GAP_MS / MIN + 1;
    const visits = zoneVisits([
      inZone(0, 1), inZone(6, 1), inZone(12, null), inZone(18, null),
      inZone(24, 1), inZone(30, 1), inZone(gapAfter30, 1), inZone(gapAfter30 + 6, 1),
    ]);

    expect(visits.map((v) => v.positions)).toEqual([2, 2, 2]);
  });
});
