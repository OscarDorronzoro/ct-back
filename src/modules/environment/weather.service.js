import weatherRepository from './weather.repository';
import openMeteoClient from './openMeteo.client';
import zoneRepository from '../monitoring/zone.repository';
import { fetchRange, storableHours } from './weather.util';

const SOURCE = 'open-meteo';

const weatherService = {

  // Brings the stored hourly series up to date, filling any gap since the last stored hour.
  // The location is the center of the zones: the weather is the same across the farm.
  async sync(now = new Date()) {
    const center = await zoneRepository.findCenter();

    if (!center) {
      return { skipped: 'no zones to locate the farm' };
    }

    const range = fetchRange(await weatherRepository.findLastObservedAt(), now);
    const hourly = await openMeteoClient.fetchHourly({ ...center, ...range });

    const rows = storableHours(hourly, now)
      .map((row) => ({ ...row, source: SOURCE, fetchedAt: now }));

    const stored = await weatherRepository.upsertMany(rows);

    return { ...range, stored };
  },
};

export default weatherService;
