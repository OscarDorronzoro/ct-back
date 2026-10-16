import positionRepository from './position.repository';
import rawRfMessageRepository from '../telemetry/rawRfMessage.repository';
import collarRepository from '../devices/collar.repository';
import cowRepository from '../livestock/cow.repository';
import eventRepository from '../telemetry/event.repository';

import { batteryLevel, batteryPercent } from '../devices/battery.util';
import { EVENT_TYPES } from '../telemetry/rf.constants';

const MINUTE = 60 * 1000;

// Sleep state of the collar when the position was recorded
async function collarState(collarId, at) {
  const event = await eventRepository.findLastBefore(
    collarId,
    [EVENT_TYPES.SLEEP, EVENT_TYPES.WAKE],
    at,
  );

  if (event?.eventTypeId !== EVENT_TYPES.SLEEP) {
    return { status: 'awake', since: event?.occurredAt ?? null };
  }

  const sleepMin = event.metadata?.sleepMin ?? null;

  return {
    status: 'sleeping',
    since: event.occurredAt,
    sleepMin,
    wakeExpectedAt: sleepMin ? new Date(event.occurredAt.getTime() + sleepMin * MINUTE) : null,
  };
}

// Battery reading of the position's message, or the last one before it
async function batteryAt(raw, collar, at) {
  let reading = raw?.voltage
    ? { voltage: raw.voltage, recordedAt: raw.recordedAt }
    : null;

  if (!reading && collar) {
    reading = await rawRfMessageRepository.findLastVoltage(collar.code, at);
  }

  if (!reading) {
    return null;
  }

  return {
    voltage: reading.voltage,
    percent: batteryPercent(reading.voltage),
    level: batteryLevel(reading.voltage, collar?.params),
    recordedAt: reading.recordedAt,
  };
}

const positionService = {

  // Everything the map shows for a position
  async getDetails(id) {
    const position = await positionRepository.findById(id);

    if (!position) {
      return null;
    }

    const at = position.recordedAt;

    const [raw, collar, cow] = await Promise.all([
      position.rawRfMessageId ? rawRfMessageRepository.findById(position.rawRfMessageId) : null,
      collarRepository.findByIdWithDeleted(position.collarId),
      position.cowId ? cowRepository.findById(position.cowId) : null,
    ]);

    const [state, battery] = await Promise.all([
      collarState(position.collarId, at),
      batteryAt(raw, collar, at),
    ]);

    return {
      position,
      collar: collar && {
        id: collar.id,
        code: collar.code,
        description: collar.description,
        firmwareVersion: collar.firmwareVersion,
      },
      cow: cow && {
        id: cow.id,
        alias: cow.alias,
        earTag: cow.earTag,
        imageUrl: cow.imageUrl,
      },
      signal: raw && {
        rssi: raw.rssi,
        snr: raw.snr,
        hdop: raw.hdop,
        satellitesCount: raw.satellitesCount,
        messageType: raw.type,
        integrity: raw.integrity,
      },
      battery,
      state,
    };
  },

};

export default positionService;
