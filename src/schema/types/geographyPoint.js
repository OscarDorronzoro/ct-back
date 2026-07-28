import { customType } from 'drizzle-orm/pg-core';
import wkx from 'wkx';

const geographyPoint = customType({

  dataType() {
    return 'geography(Point,4326)';
  },

  fromDriver(value) {
    if (!value) return null;

    const geoJSON = wkx.Geometry
      .parse(Buffer.from(value, 'hex'))
      .toGeoJSON();

    return {
      latitude: geoJSON.coordinates[1],
      longitude: geoJSON.coordinates[0],
    };
  },

  toDriver(value) {
    if (!value) return null;
    return `SRID=4326;POINT(${value.longitude} ${value.latitude})`;
  },

});

export default geographyPoint;
