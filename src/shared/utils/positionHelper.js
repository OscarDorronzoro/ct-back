const toRad = (value) => (value * Math.PI) / 180;
const toDeg = (value) => (value * 180) / Math.PI;

export default function haversine(position1, position2) {
  if (!position1 || !position2) { return null; }
  const lat1 = position1.location.latitude;
  const lon1 = position1.location.longitude;
  const lat2 = position2.location.latitude;
  const lon2 = position2.location.longitude;

  // logger.debug(`${JSON.stringify(position1)}---${JSON.stringify(position2)}`);

  const R = 6371000; // Radio de la Tierra en m

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1))
    * Math.cos(toRad(lat2))
    * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Initial bearing from position1 to position2, in degrees clockwise from north (0..360)
export function bearing(position1, position2) {
  const lat1 = toRad(position1.location.latitude);
  const lat2 = toRad(position2.location.latitude);
  const dLon = toRad(position2.location.longitude - position1.location.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
