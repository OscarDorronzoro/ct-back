import { customType } from 'drizzle-orm/pg-core';
import wkx from 'wkx';

// Polygon as a list of [latitude, longitude] vertices, without repeating the first one
const geographyPolygon = customType({

  dataType() {
    return 'geography(Polygon,4326)';
  },

  fromDriver(value) {
    if (!value) return null;

    const geoJSON = wkx.Geometry
      .parse(Buffer.from(value, 'hex'))
      .toGeoJSON();

    const ring = geoJSON.coordinates[0].map(([lon, lat]) => [lat, lon]);

    return ring.slice(0, -1);
  },

  toDriver(value) {
    if (!value) return null;

    const ring = [...value, value[0]]
      .map(([lat, lon]) => `${lon} ${lat}`)
      .join(', ');

    return `SRID=4326;POLYGON((${ring}))`;
  },

});

export default geographyPolygon;
