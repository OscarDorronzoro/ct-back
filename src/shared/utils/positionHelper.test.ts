import { describe, it, expect } from 'vitest';

import haversine, { bearing } from './positionHelper';

const at = (latitude: number, longitude: number) => ({ location: { latitude, longitude } });
const origin = at(-33, -61);

describe('haversine', () => {
  it('measures one degree of latitude as ~111.2 km', () => {
    expect(haversine(origin, at(-34, -61))).toBeCloseTo(111195, -1);
  });

  it('returns null without one of the positions', () => {
    expect(haversine(origin, null)).toBeNull();
  });
});

describe('bearing', () => {
  it.each([
    ['north', at(-32.99, -61), 0],
    ['east', at(-33, -60.99), 90],
    ['south', at(-33.01, -61), 180],
    ['west', at(-33, -61.01), 270],
  ])('%s', (_, destination, degrees) => {
    expect(bearing(origin, destination)).toBeCloseTo(degrees, 0);
  });

  it('is always within 0..360', () => {
    const value = bearing(origin, at(-33.01, -61.01));

    expect(value).toBeGreaterThan(180);
    expect(value).toBeLessThan(270);
  });
});
