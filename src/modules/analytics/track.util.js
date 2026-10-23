import haversine from '../../shared/utils/positionHelper';

// Cleaning of the GPS track of a cow, for the dw. The positions stay as they were; this works on
// copies: { id, recordedAt (Date), latitude, longitude, accuracy, zoneId,
// distanceToPrevious }.

// Stop detection (stay points, Li et al. 2008): the cow is in a stop while its positions fall
// within STOP_RADIUS_M of the center of the stop; leaving needs CONFIRM_POINTS positions in a row
// outside (one GPS jump doesn't count). The radius grows with bad fixes:
// max(STOP_RADIUS_M, 2 × accuracy).
export const STOP_RADIUS_M = 30;
export const CONFIRM_POINTS = 2;
// Longer gaps (collar off, no coverage) are neither moving nor resting, and end a stop. The collars
// sleep up to an hour between fixes at night: that still counts.
export const MAX_GAP_MS = 90 * 60 * 1000;

const distance = (a, b) => haversine({ location: a }, { location: b });
const radiusFor = (point) => Math.max(STOP_RADIUS_M, 2 * (point.accuracy ?? 0));

// Weight of a fix in the center of a stop: the better the fix, the more it weighs (1 / accuracy²)
const weightOf = (point) => 1 / Math.max(point.accuracy ?? 5, 1) ** 2;

function newCluster(point) {
  return {
    points: [point],
    weight: weightOf(point),
    latitude: point.latitude,
    longitude: point.longitude,
  };
}

// The cluster with one more point: its center moves towards it by the weight of the fix
function addToCluster(cluster, point) {
  const w = weightOf(point);
  const total = cluster.weight + w;

  return {
    points: [...cluster.points, point],
    weight: total,
    latitude: cluster.latitude + ((point.latitude - cluster.latitude) * w) / total,
    longitude: cluster.longitude + ((point.longitude - cluster.longitude) * w) / total,
  };
}

// points: positions of one cow, oldest first.
// Returns:
// - stops: [{ startedAt, endedAt, latitude, longitude, positions, zoneId }] (2 positions or more);
// - steps: per position, { point, meters, stopIndex } where meters is the filtered distance that
//   ends at it (0 inside a stop) and stopIndex the stop it belongs to (or null).
export function buildTrack(points) {
  const stops = [];
  const steps = [];
  let cluster = null;
  let outside = [];
  let lastAnchor = null; // last point of the filtered path

  const closeCluster = () => {
    if (cluster.points.length >= 2) {
      const zones = new Map();
      cluster.points.forEach((p) => zones.set(p.zoneId, (zones.get(p.zoneId) ?? 0) + 1));
      const zoneId = [...zones.entries()].sort((a, b) => b[1] - a[1])[0][0];

      stops.push({
        startedAt: cluster.points[0].recordedAt,
        endedAt: cluster.points[cluster.points.length - 1].recordedAt,
        latitude: cluster.latitude,
        longitude: cluster.longitude,
        positions: cluster.points.length,
        zoneId,
      });
      cluster.points.forEach((p) => { steps[p.index].stopIndex = stops.length - 1; });
    }
  };

  points.forEach((point, index) => {
    const p = { ...point, index };
    steps.push({ point, meters: 0, stopIndex: null });

    if (!cluster) {
      cluster = newCluster(p);
      lastAnchor = p;
      return;
    }

    // After a long gap nothing is known of what happened: the stop ends there. If the cow shows up
    // somewhere else, the straight line counts (the least it walked).
    const previousAt = (outside.at(-1) ?? cluster.points.at(-1)).recordedAt;
    if (p.recordedAt - previousAt > MAX_GAP_MS) {
      closeCluster();
      const end = cluster.points.length >= 2
        ? { latitude: cluster.latitude, longitude: cluster.longitude }
        : cluster.points.at(-1);
      const last = outside.at(-1) ?? end;
      steps[index].meters = distance(last, p) > radiusFor(p) ? distance(last, p) : 0;
      cluster = newCluster(p);
      lastAnchor = p;
      outside = [];
      return;
    }

    // Back inside: the points that seemed to leave were a GPS jump, they belong to the stop
    if (distance(cluster, p) <= radiusFor(p)) {
      cluster = [...outside, p].reduce(addToCluster, cluster);
      outside = [];
      return;
    }

    outside.push(p);
    if (outside.length < CONFIRM_POINTS) {
      return;
    }

    // It left: the path goes from the stop (its center) through the points outside
    closeCluster();
    const center = { latitude: cluster.latitude, longitude: cluster.longitude };
    const from = cluster.points.length >= 2 ? center : lastAnchor;
    let previous = from;
    outside.forEach((o) => {
      steps[o.index].meters = distance(previous, o);
      previous = o;
    });

    lastAnchor = outside[outside.length - 1];
    cluster = newCluster(lastAnchor);
    outside = [];
  });

  if (cluster) {
    closeCluster();
  }

  return { stops, steps };
}

// Activity per local day (dateKey: point -> 'YYYY-MM-DD'). Each interval between two positions
// counts on the day of the later one: resting if both are in the same stop, moving otherwise;
// longer than MAX_GAP_MS it doesn't count.
export function dailyActivity(steps, dateKey) {
  const days = new Map();

  steps.forEach((step, i) => {
    const key = dateKey(step.point.recordedAt);
    if (!days.has(key)) {
      days.set(key, {
        dateKey: key, positions: 0, rawMeters: 0, meters: 0, movingMinutes: 0, restingMinutes: 0,
      });
    }

    const day = days.get(key);
    day.positions += 1;
    day.meters += step.meters;
    if (i > 0) {
      day.rawMeters += step.point.distanceToPrevious ?? 0;

      const previous = steps[i - 1];
      const gap = step.point.recordedAt - previous.point.recordedAt;
      if (gap <= MAX_GAP_MS) {
        const resting = step.stopIndex !== null && step.stopIndex === previous.stopIndex;
        day[resting ? 'restingMinutes' : 'movingMinutes'] += gap / 60000;
      }
    }
  });

  return [...days.values()];
}

// Stays in zones: consecutive positions in the same zone (outside every zone doesn't count).
// Changing zone needs CONFIRM_POINTS positions in a row in the new one (a jump at the border of a
// paddock doesn't make a visit); a gap longer than MAX_GAP_MS ends the visit.
export function zoneVisits(points) {
  const visits = [];
  let current = null;
  let pending = [];

  const close = (leftAt) => {
    if (current && current.zoneId !== null) {
      visits.push({ ...current, leftAt });
    }
  };

  points.forEach((p) => {
    if (current && p.recordedAt - current.lastAt > MAX_GAP_MS) {
      close(current.lastAt);
      current = null;
      pending = [];
    }

    if (!current) {
      current = {
        zoneId: p.zoneId, enteredAt: p.recordedAt, lastAt: p.recordedAt, positions: 1,
      };
      return;
    }

    if (p.zoneId === current.zoneId) {
      current.positions += pending.length + 1;
      current.lastAt = p.recordedAt;
      pending = [];
      return;
    }

    pending.push(p);
    if (pending.length < CONFIRM_POINTS || pending.some((q) => q.zoneId !== p.zoneId)) {
      if (pending.length >= CONFIRM_POINTS) {
        pending = [p];
      }
      return;
    }

    close(pending[0].recordedAt);
    current = {
      zoneId: p.zoneId,
      enteredAt: pending[0].recordedAt,
      lastAt: p.recordedAt,
      positions: pending.length,
    };
    pending = [];
  });

  if (current) {
    close(current.lastAt);
  }

  return visits;
}
