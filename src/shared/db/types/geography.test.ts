import { describe, it, expect } from 'vitest';
import { pgTable } from 'drizzle-orm/pg-core';
import wkx from 'wkx';

import geographyPoint from './geographyPoint';
import geographyPolygon from './geographyPolygon';

// The columns as the schemas use them
const places = pgTable('places', {
  location: geographyPoint(),
  area: geographyPolygon(),
});

// What PostGIS returns: hex of the WKB
const wkbHex = (geometry: wkx.Geometry) => geometry.toWkb().toString('hex');

describe('geographyPoint', () => {
  it('writes longitude first (x) for PostGIS', () => {
    expect(places.location.mapToDriverValue({ latitude: -32.97, longitude: -61.21 }))
      .toBe('SRID=4326;POINT(-61.21 -32.97)');
  });

  it('reads the point back as latitude and longitude', () => {
    const fromDb = wkbHex(new wkx.Point(-61.21, -32.97));

    expect(places.location.mapFromDriverValue(fromDb))
      .toEqual({ latitude: -32.97, longitude: -61.21 });
  });

  it('keeps null', () => {
    expect(places.location.mapToDriverValue(null)).toBeNull();
    expect(places.location.mapFromDriverValue(null)).toBeNull();
  });
});

describe('geographyPolygon', () => {
  const vertices = [[-32.97, -61.21], [-32.97, -61.2], [-32.96, -61.2]];

  it('closes the ring and writes each vertex as longitude latitude', () => {
    expect(places.area.mapToDriverValue(vertices))
      .toBe('SRID=4326;POLYGON((-61.21 -32.97, -61.2 -32.97, -61.2 -32.96, -61.21 -32.97))');
  });

  it('reads the vertices back as [latitude, longitude], without the closing one', () => {
    const ring = [...vertices, vertices[0]].map(([lat, lon]) => new wkx.Point(lon, lat));
    const fromDb = wkbHex(new wkx.Polygon(ring));

    expect(places.area.mapFromDriverValue(fromDb)).toEqual(vertices);
  });
});
