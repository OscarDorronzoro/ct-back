const DAY_MS = 24 * 3600 * 1000;

// History loaded on the first sync of a zone
export const INITIAL_DAYS = 365;
// Images are processed some days after they are taken: each sync looks back this far again
export const LOOKBACK_DAYS = 15;
// An image counts only if at least this part of the zone was seen clear
export const MIN_VALID_FRACTION = 0.5;
// Days per request (the history goes in several)
export const CHUNK_DAYS = 90;

// Runs in Copernicus for each pixel of each image: NDVI of the clear pixels only. Scene
// classification (SCL) kept: 4 vegetation, 5 not vegetated; clouds, their shadows, water, snow
// and defective pixels are left out.
export const NDVI_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}

function evaluatePixel(s) {
  const sum = s.B08 + s.B04;
  const clear = s.dataMask === 1 && (s.SCL === 4 || s.SCL === 5) && sum !== 0;
  return {
    ndvi: [clear ? (s.B08 - s.B04) / sum : 0],
    dataMask: [clear ? 1 : 0]
  };
}`;

const utcDate = (date) => date.toISOString().slice(0, 10);

// Ranges [from, to) to ask for a zone, in chunks of CHUNK_DAYS: from LOOKBACK_DAYS before its last
// image, or INITIAL_DAYS back if it has none, until tomorrow (today included)
export function fetchRanges(lastAcquiredOn, now) {
  const start = lastAcquiredOn
    ? new Date(new Date(`${lastAcquiredOn}T00:00:00Z`).getTime() - LOOKBACK_DAYS * DAY_MS)
    : new Date(new Date(`${utcDate(now)}T00:00:00Z`).getTime() - INITIAL_DAYS * DAY_MS);
  const end = new Date(new Date(`${utcDate(now)}T00:00:00Z`).getTime() + DAY_MS);

  const ranges = [];
  for (let from = start; from < end; from = new Date(from.getTime() + CHUNK_DAYS * DAY_MS)) {
    const to = new Date(Math.min(from.getTime() + CHUNK_DAYS * DAY_MS, end.getTime()));
    ranges.push({ from, to });
  }
  return ranges;
}

const asNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

// Pixels of 10 x 10 m
const PIXEL_M2 = 100;

// Statistical API intervals -> observations worth keeping (enough of the zone seen clear).
// The API counts the pixels of the box around the zone (outside the polygon they are no data),
// so the clear part is measured against the area of the zone itself.
export function toObservations(intervals, zoneAreaM2) {
  const zonePixels = zoneAreaM2 / PIXEL_M2;

  return intervals.flatMap(({ interval, outputs }) => {
    const stats = outputs?.ndvi?.bands?.B0?.stats;
    if (!stats || !stats.sampleCount) {
      return [];
    }

    const pixels = stats.sampleCount - (stats.noDataCount ?? 0);
    const validFraction = Math.min(1, pixels / zonePixels);
    const mean = asNumber(stats.mean);

    if (validFraction < MIN_VALID_FRACTION || mean === null) {
      return [];
    }

    return [{
      acquiredOn: interval.from.slice(0, 10),
      ndviMean: mean,
      ndviMin: asNumber(stats.min) ?? mean,
      ndviMax: asNumber(stats.max) ?? mean,
      ndviStdev: asNumber(stats.stDev) ?? 0,
      validFraction,
      pixels,
    }];
  });
}
