import ndviRepository from './ndvi.repository';
import copernicusClient, { isConfigured } from './copernicus.client';
import { fetchRanges, toObservations } from './ndvi.util';
import logger from '../../shared/utils/logger';

const SOURCE = 'copernicus-sentinel-2';

const ndviService = {
  // Brings the NDVI of each watched zone up to date. One zone after the other, and one range after
  // the other: few requests at a time, within the rate limits of the free tier.
  async sync(now = new Date()) {
    if (!isConfigured()) {
      return { skipped: 'Copernicus credentials not configured' };
    }

    const zones = await ndviRepository.findZones();

    return zones.reduce(async (previous, zone) => {
      const total = await previous;

      try {
        const ranges = fetchRanges(await ndviRepository.findLastAcquiredOn(zone.id), now);
        const intervals = await ranges.reduce(async (acc, range) => [
          ...(await acc),
          ...(await copernicusClient.fetchNdviStatistics({ ...zone, ...range })),
        ], Promise.resolve([]));

        const rows = toObservations(intervals, zone.areaM2).map((o) => ({
          ...o, zoneId: zone.id, source: SOURCE, fetchedAt: now,
        }));
        const stored = await ndviRepository.upsertMany(rows);

        return { ...total, zones: total.zones + 1, images: total.images + stored };
      } catch (err) {
        logger.error({ message: 'NDVI sync failed for a zone', zoneId: zone.id, error: err });
        return { ...total, failed: total.failed + 1 };
      }
    }, Promise.resolve({ zones: 0, images: 0, failed: 0 }));
  },
};

export default ndviService;
