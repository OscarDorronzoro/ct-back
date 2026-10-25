import {
  describe, it, expect, beforeEach, afterAll, vi,
} from 'vitest';
import webpush from 'web-push';

import runInOrder from '../../src/shared/utils/runInOrder';
import rawRfMessageService from '../../src/modules/telemetry/rawRfMessage.service';
import notificationService from '../../src/modules/notifications/notification.service';
import { EVENT_TYPES, INVALID_REASONS } from '../../src/modules/telemetry/rf.constants';
import { gatewayClient, type ApiClient } from './helpers/api';
import { resetDatabase, query, closeDatabase } from './helpers/database';
import { createGateway, loggedIn } from './helpers/fixtures';

// The push services are outside: what would be sent is checked on the mock
vi.mock('web-push', () => ({ default: { sendNotification: vi.fn() } }));
const sendNotification = vi.mocked(webpush.sendNotification);

afterAll(closeDatabase);

// The field (general zone, ~2 km) and a small exclusion zone inside it, near its south edge.
// [lat, lon] as the API takes them.
const square = (lat: number, lon: number, half: number) => [
  [lat - half, lon - half],
  [lat - half, lon + half],
  [lat + half, lon + half],
  [lat + half, lon - half],
];
const FIELD = square(-32.97, -61.21, 0.01);
const EXCLUSION = square(-32.977, -61.208, 0.0005);

// Points ~170-330 m apart: plausible moves for a cow every few minutes
const IN_FIELD = { latitude: -32.9785, longitude: -61.208 };
const OUTSIDE = { latitude: -32.9815, longitude: -61.208 };
const IN_EXCLUSION = { latitude: -32.977, longitude: -61.208 };

const COLLAR_CODE = 12;

interface Setup {
  admin: ApiClient;
  gateway: ReturnType<typeof gatewayClient>;
  cowId: number;
  collarId: number;
  fieldId: number;
  exclusionId: number;
  // Time of the n-th message: n minutes after the collar was put on the cow
  at: (minutes: number) => string;
}

let setup: Setup;

beforeEach(async () => {
  await resetDatabase();
  sendNotification.mockReset();
  sendNotification.mockResolvedValue({ statusCode: 201, body: '', headers: {} });

  const { client: admin } = await loggedIn('admin', ['admin']);
  const gateway = gatewayClient(await createGateway());

  const field = await admin.post('/api/zones', { name: 'Campo', zoneTypeId: 1, points: FIELD });
  const exclusion = await admin.post('/api/zones', { name: 'Laguna', zoneTypeId: 6, points: EXCLUSION });
  const collar = await admin.post('/api/collars', { code: COLLAR_CODE });
  const cow = await admin.post('/api/cows', { alias: 'Ángela', currentCollarId: collar.body.collar.id });

  // The collar belongs to the cow from now on: its messages come after
  const start = Date.now() + 1000;

  setup = {
    admin,
    gateway,
    cowId: cow.body.cow.id,
    collarId: collar.body.collar.id,
    fieldId: field.body.zone.id,
    exclusionId: exclusion.body.zone.id,
    at: (minutes) => new Date(start + minutes * 60_000).toISOString(),
  };
});

// A message of the collar: a position by default
function message(minutes: number, values: object = IN_FIELD) {
  return {
    collarId: COLLAR_CODE,
    type: 'pos',
    integrity: 'ok',
    recordedAt: setup.at(minutes),
    hdop: 1.1,
    rssi: -80,
    snr: 8,
    ...IN_FIELD,
    ...values,
  };
}

// One after another: the reception order is the processing order
async function receive(...messages: object[]) {
  await runInOrder(messages, async (body: object) => {
    const res = await setup.gateway.send(body);
    expect(res.status).toBe(202);
  });
}

const process = () => rawRfMessageService.processPendingMessages();

const events = (types?: number[]) => query<{ event_type_id: number; zone_id: number | null }>(
  `SELECT event_type_id, zone_id, cow_id, position_id FROM events
   WHERE $1::int[] IS NULL OR event_type_id = ANY($1) ORDER BY id`,
  [types ?? null],
);

const ZONE_EVENTS = [
  EVENT_TYPES.FIELD_EXIT,
  EVENT_TYPES.FIELD_RETURN,
  EVENT_TYPES.EXCLUSION_ENTER,
  EVENT_TYPES.EXCLUSION_EXIT,
];

describe('reception', () => {
  it('takes messages only with the key of an active gateway', async () => {
    const body = message(0);

    expect((await gatewayClient('').send(body)).status).toBe(401);
    expect((await gatewayClient('gw_wrong').send(body)).status).toBe(401);
    expect((await setup.gateway.send(body)).status).toBe(202);

    await query('UPDATE gateways SET revoked_at = now()');
    expect((await setup.gateway.send(body)).status).toBe(401);

    const stored = await query('SELECT collar_code, processed_at FROM raw_rf_messages');
    expect(stored).toEqual([{ collar_code: COLLAR_CODE, processed_at: null }]);
  });

  it('rejects malformed messages', async () => {
    const res = await setup.gateway.send({ ...message(0), latitude: 'south' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

describe('processing of positions', () => {
  it('stores the position with its cow and the smallest zone that contains it', async () => {
    await receive(message(0, IN_FIELD), message(3, IN_EXCLUSION), message(6, OUTSIDE));
    await process();

    const positions = await query('SELECT cow_id, zone_id FROM positions ORDER BY recorded_at');
    expect(positions).toEqual([
      { cow_id: setup.cowId, zone_id: setup.fieldId },
      { cow_id: setup.cowId, zone_id: setup.exclusionId },
      { cow_id: setup.cowId, zone_id: null },
    ]);

    const pending = await query('SELECT id FROM raw_rf_messages WHERE processed_at IS NULL');
    expect(pending).toEqual([]);
  });

  it('marks invalid messages with their reason and stores no position for them', async () => {
    await receive(
      message(0),
      // The same fix again
      message(0),
      // 1.4 km in a minute
      message(1, { latitude: -32.9655 }),
      // Outside the area of the gateway
      message(2, { latitude: -33.5 }),
      // A collar nobody registered
      { ...message(3), collarId: 99 },
    );
    await process();

    const reasons = await query<{ invalid_reason_id: number }>(
      'SELECT invalid_reason_id FROM raw_rf_messages ORDER BY id',
    );
    const [ok, repeated, jump, far, unknown] = reasons.map((r) => r.invalid_reason_id);
    expect(ok).toBe(INVALID_REASONS.OK);
    expect(repeated).toBe(INVALID_REASONS.REPEATED_POSITION);
    // One of the impossible movement reasons (6..11): it breaks several of their limits
    expect(jump).toBeGreaterThanOrEqual(INVALID_REASONS.IMPOSSIBLE_MOVEMENT);
    expect(jump).toBeLessThanOrEqual(INVALID_REASONS.IMPOSSIBLE_MOVEMENT + 5);
    expect(far).toBe(INVALID_REASONS.WRONG_LOCATION);
    expect(unknown).toBe(INVALID_REASONS.UNKNOWN_COLLAR);
    expect(await query('SELECT id FROM positions')).toHaveLength(1);
  });
});

describe('events of the collar', () => {
  it('records the sleep, and the wake with the next message', async () => {
    await receive(message(0, { type: 'sleep', sleepMin: 60 }), message(60));
    await process();

    const found = await events([EVENT_TYPES.SLEEP, EVENT_TYPES.WAKE]);
    expect(found.map((e) => e.event_type_id)).toEqual([EVENT_TYPES.SLEEP, EVENT_TYPES.WAKE]);
  });

  it('records the battery levels once each, recovering only 100 mV above the low threshold', async () => {
    await receive(
      message(0, { voltage: 3.5 }), // low (< 3.55 V)
      message(3, { voltage: 3.6 }), // still low
      message(6, { voltage: 3.4 }), // critical (< 3.45 V)
      message(9, { voltage: 3.52 }), // back to low: not an event
      message(12, { voltage: 3.7 }), // recovered (>= 3.65 V)
    );
    await process();

    const battery = [
      EVENT_TYPES.BATTERY_LOW, EVENT_TYPES.BATTERY_CRITICAL, EVENT_TYPES.BATTERY_RECOVERED,
    ];
    const found = await events(battery);
    expect(found.map((e) => e.event_type_id)).toEqual(battery);
  });
});

describe('zone events of the cow', () => {
  it('records leaving and coming back to the field, each with two positions in a row', async () => {
    await receive(
      message(0, IN_FIELD),
      message(3, OUTSIDE), // one outside: GPS noise, nothing yet
      message(6, OUTSIDE), // the second one: left the field
      message(9, OUTSIDE),
      message(12, IN_FIELD),
      message(15, IN_FIELD), // back
    );
    await process();

    const found = await events(ZONE_EVENTS);
    expect(found).toEqual([
      expect.objectContaining({
        event_type_id: EVENT_TYPES.FIELD_EXIT, zone_id: null, cow_id: setup.cowId,
      }),
      expect.objectContaining({ event_type_id: EVENT_TYPES.FIELD_RETURN }),
    ]);
  });

  it('ignores a single position outside', async () => {
    await receive(message(0, IN_FIELD), message(3, OUTSIDE), message(6, IN_FIELD));
    await process();

    expect(await events(ZONE_EVENTS)).toEqual([]);
  });

  it('records entering and leaving an exclusion zone, with the zone', async () => {
    await receive(
      message(0, IN_FIELD),
      message(3, IN_EXCLUSION),
      message(6, IN_EXCLUSION),
      message(9, IN_FIELD),
      message(12, IN_FIELD),
    );
    await process();

    const found = await events(ZONE_EVENTS);
    expect(found.map((e) => [e.event_type_id, e.zone_id])).toEqual([
      [EVENT_TYPES.EXCLUSION_ENTER, setup.exclusionId],
      [EVENT_TYPES.EXCLUSION_EXIT, setup.exclusionId],
    ]);
  });

  it('keeps the state of the cow between batches (from its last events)', async () => {
    const path = [IN_FIELD, OUTSIDE, OUTSIDE, OUTSIDE, OUTSIDE];
    const steps = path.map((point, i) => message(i * 3, point));

    // One message per batch, like the job every 5 seconds
    await runInOrder(steps, async (step: object) => {
      await receive(step);
      await process();
    });

    const found = await events(ZONE_EVENTS);
    expect(found.map((e) => e.event_type_id)).toEqual([EVENT_TYPES.FIELD_EXIT]);
  });
});

describe('notifications', () => {
  // A user's device with notifications turned on
  async function subscribedDevice() {
    const { client } = await loggedIn('ana', ['viewer']);
    const subscription = {
      endpoint: 'https://push.example.com/send/device-1',
      keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' },
    };
    expect((await client.put('/api/notifications/push/subscription', subscription)).status).toBe(204);
    return client;
  }

  const sentPayloads = () => sendNotification.mock.calls
    .map(([, payload]) => JSON.parse(payload as string));

  it('notifies the exit from the field once, with the cow, and opens the map on it', async () => {
    await subscribedDevice();
    const path = [IN_FIELD, OUTSIDE, OUTSIDE, OUTSIDE];
    await receive(...path.map((point, i) => message(i * 3, point)));
    await process();

    expect(await notificationService.deliverNewEvents()).toBe(1);
    expect(sendNotification).toHaveBeenCalledOnce();
    expect(sendNotification.mock.calls[0][0]).toMatchObject({ endpoint: 'https://push.example.com/send/device-1' });
    expect(sentPayloads()[0]).toMatchObject({
      title: 'Vaca fuera del campo',
      url: `/?cow=${setup.cowId}`,
    });
    expect(sentPayloads()[0].body).toContain('Ángela (collar 12) salió del campo');

    // Already delivered: the cursor moved past it
    expect(await notificationService.deliverNewEvents()).toBe(0);
    expect(sendNotification).toHaveBeenCalledOnce();
  });

  it('notifies entering an exclusion zone, naming it, but not the returns', async () => {
    await subscribedDevice();
    const path = [IN_FIELD, IN_EXCLUSION, IN_EXCLUSION, IN_FIELD, IN_FIELD];
    await receive(...path.map((point, i) => message(i * 3, point)));
    await process();
    await notificationService.deliverNewEvents();

    expect(sentPayloads().map((p) => p.title)).toEqual(['Vaca en zona de exclusión']);
    expect(sentPayloads()[0].body).toContain('entró a «Laguna»');
  });

  it("doesn't notify old events (a gateway sending its queue late)", async () => {
    await subscribedDevice();
    await receive(message(0, IN_FIELD), message(3, OUTSIDE), message(6, OUTSIDE));
    await process();

    const inAnHour = new Date(Date.now() + 60 * 60_000);
    expect(await notificationService.deliverNewEvents(inAnHour)).toBe(1);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('stops after logging out on the device', async () => {
    const device = await subscribedDevice();
    await device.post('/api/auth/logout');

    await receive(message(0, IN_FIELD), message(3, OUTSIDE), message(6, OUTSIDE));
    await process();
    await notificationService.deliverNewEvents();

    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('forgets a device the push service says is gone', async () => {
    await subscribedDevice();
    sendNotification.mockRejectedValue(Object.assign(new Error('Gone'), { statusCode: 410 }));

    await receive(message(0, IN_FIELD), message(3, OUTSIDE), message(6, OUTSIDE));
    await process();
    await notificationService.deliverNewEvents();

    expect(await query('SELECT id FROM push_subscriptions')).toEqual([]);
  });

  it('sends a test notification to the devices of the user', async () => {
    const device = await subscribedDevice();

    const res = await device.post('/api/notifications/push/test');

    expect(res.body).toEqual({ sent: 1 });
    expect(sentPayloads()[0].title).toBe('Notificación de prueba');
  });
});

describe('collars', () => {
  it('gives different codes to collars created at the same time', async () => {
    const created = await Promise.all([1, 2, 3, 4].map(() => setup.admin.post('/api/collars', {})));

    expect(created.map((r) => r.status)).toEqual([201, 201, 201, 201]);
    expect(new Set(created.map((r) => r.body.collar.code)).size).toBe(4);
  });
});
