import { describe, it, expect } from 'vitest';

import { createZoneBody, updateZoneBody } from './zone.validator';

const triangle = [[-33, -61], [-33.01, -61], [-33.01, -61.01]];

describe('createZoneBody', () => {
  it('trims the name and turns an empty description into null', () => {
    const zone = createZoneBody.parse({ name: '  Lote 1 ', zoneTypeId: 2, points: triangle });

    expect(zone.name).toBe('Lote 1');
    expect(zone.description).toBeNull();
  });

  it('removes a closing vertex equal to the first one', () => {
    const zone = createZoneBody.parse({ name: 'x', zoneTypeId: 2, points: [...triangle, triangle[0]] });

    expect(zone.points).toEqual(triangle);
  });

  it('needs at least 3 vertices after removing the closing one', () => {
    const points = [triangle[0], triangle[1], triangle[0]];

    expect(createZoneBody.safeParse({ name: 'x', zoneTypeId: 2, points }).success).toBe(false);
  });

  it('rejects coordinates out of range', () => {
    const points = [[-91, -61], ...triangle.slice(1), [-33, -60]];

    expect(createZoneBody.safeParse({ name: 'x', zoneTypeId: 2, points }).success).toBe(false);
  });
});

describe('updateZoneBody', () => {
  it('only validates the fields sent', () => {
    expect(updateZoneBody.parse({ description: '' })).toEqual({ description: null });
  });
});
