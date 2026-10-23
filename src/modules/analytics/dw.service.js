import db from '../../shared/db/drizzle';
import dwRepository from './dw.repository';
import { buildTrack, dailyActivity, zoneVisits } from './track.util';
import { farmDateKey } from './analytics.constants';
import { batteryPercent } from '../devices/battery.util';

const minutesBetween = (from, to) => (to - from) / 60000;

// Moves `at` back while a stored stop or zone visit goes on past it, so none is cut in two
async function widenStart(cowId, at, tx) {
  const earlier = await dwRepository.crossingStart(cowId, at, tx);
  return earlier && earlier < at ? widenStart(cowId, earlier, tx) : at;
}

const dwService = {
  // Recomputes the facts of a cow from the day refreshDay says (yesterday on a normal run, its
  // whole history on the first one). Earlier days stay as they were.
  async refreshCow(cowId) {
    return db.transaction(async (tx) => {
      const refresh = await dwRepository.refreshDay(cowId, tx);

      if (!refresh) {
        return null;
      }

      const from = await widenStart(cowId, refresh.start, tx);
      const points = await dwRepository.positionsFrom(cowId, from, tx);
      const { stops, steps } = buildTrack(points);
      const visits = zoneVisits(points);
      const days = dailyActivity(steps, farmDateKey).filter((d) => d.dateKey >= refresh.day);

      await dwRepository.replaceCowFacts(cowId, {
        from,
        day: refresh.day,
        stops: stops.map((s) => ({
          cowId,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          durationMin: minutesBetween(s.startedAt, s.endedAt),
          center: { latitude: s.latitude, longitude: s.longitude },
          zoneId: s.zoneId,
          positions: s.positions,
        })),
        visits: visits.map((v) => ({
          cowId,
          zoneId: v.zoneId,
          enteredAt: v.enteredAt,
          leftAt: v.leftAt,
          durationMin: minutesBetween(v.enteredAt, v.leftAt),
          positions: v.positions,
        })),
        days: days.map((d) => ({
          dateKey: d.dateKey,
          cowId,
          positions: d.positions,
          rawDistanceM: d.rawMeters,
          distanceM: d.meters,
          movingMin: d.movingMinutes,
          restingMin: d.restingMinutes,
        })),
      }, tx);

      return {
        positions: points.length, stops: stops.length, visits: visits.length, days: days.length,
      };
    });
  },

  // Battery per collar and day, from the day batteryRefreshDay says
  async refreshBattery() {
    return db.transaction(async (tx) => {
      const day = await dwRepository.batteryRefreshDay(tx);

      if (!day) {
        return 0;
      }

      const rows = (await dwRepository.batteryDailyFrom(day, tx)).map((r) => ({
        dateKey: r.date_key,
        collarId: r.collar_id,
        cowId: r.cow_id,
        readings: r.readings,
        voltageMin: r.voltage_min,
        voltageMedian: r.voltage_median,
        voltageMax: r.voltage_max,
        voltageDawn: r.voltage_dawn,
        voltageDawnChange: r.voltage_dawn_change,
        percent: batteryPercent(r.voltage_dawn ?? r.voltage_median),
      }));

      await dwRepository.replaceBatteryDaily(day, rows, tx);
      return rows.length;
    });
  },

  // Whole refresh: shared tables, battery, then each cow (one after the other: bounded memory)
  async refresh() {
    const runId = await dwRepository.startRun();

    try {
      await db.transaction((tx) => dwRepository.rebuildShared(tx));
      const batteryDays = await this.refreshBattery();

      const cowIds = await dwRepository.cowIdsWithPositions();
      const stats = await cowIds.reduce(async (previous, cowId) => {
        const total = await previous;
        const result = await this.refreshCow(cowId);

        return result
          ? {
            cows: total.cows + 1,
            positions: total.positions + result.positions,
            stops: total.stops + result.stops,
            visits: total.visits + result.visits,
            days: total.days + result.days,
          }
          : total;
      }, Promise.resolve({
        cows: 0, positions: 0, stops: 0, visits: 0, days: 0,
      }));

      await dwRepository.finishRun(runId, { stats: { ...stats, batteryDays } });
      return { ...stats, batteryDays };
    } catch (err) {
      await dwRepository.finishRun(runId, { error: err.message });
      throw err;
    }
  },
};

export default dwService;
