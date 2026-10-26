import { describe, it, expect } from 'vitest';

import rawRfMessageValidator from './rawRfMessage.validator';

const message = {
  collarId: 12, latitude: -32.97, longitude: -61.21, type: 'pos', integrity: 'ok',
};

describe('rawRfMessageValidator', () => {
  it('takes the message of the gateway, with the reception time when it has no clock', () => {
    const before = Date.now();
    const parsed = rawRfMessageValidator.parse(message);

    expect(parsed.collarId).toBe(12);
    expect(parsed.recordedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('reads the time of the message when it comes', () => {
    const parsed = rawRfMessageValidator.parse({ ...message, recordedAt: '2026-10-24T12:00:00Z' });

    expect(parsed.recordedAt).toEqual(new Date('2026-10-24T12:00:00Z'));
  });

  it('keeps the fields of each message type (they go to data)', () => {
    const parsed = rawRfMessageValidator.parse({ ...message, type: 'join', mac: 'aabbcc001122' });

    expect(parsed).toMatchObject({ mac: 'aabbcc001122' });
  });

  it.each([
    ['a negative collar', { collarId: -1 }],
    ['a collar that is not an integer', { collarId: 1.5 }],
    ['a latitude out of range', { latitude: -91 }],
    ['a longitude that is not a number', { longitude: 'west' }],
    ['a date that is not ISO', { recordedAt: '24/10/2026' }],
    ['a raw frame that is not hex', { raw: 'zz' }],
    ['a sequence out of range', { seq: 40000 }],
  ])('rejects %s', (_, change) => {
    expect(rawRfMessageValidator.safeParse({ ...message, ...change }).success).toBe(false);
  });
});
