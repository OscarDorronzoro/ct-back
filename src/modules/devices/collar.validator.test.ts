import { describe, it, expect } from 'vitest';

import { collarBody } from './collar.validator';

describe('collarBody', () => {
  it('normalizes the MAC address', () => {
    expect(collarBody.parse({ mac: 'AA:BB:CC:DD:EE:0F' }).mac).toBe('aabbccddee0f');
    expect(collarBody.parse({ mac: 'aa-bb-cc-dd-ee-0f' }).mac).toBe('aabbccddee0f');
  });

  it('rejects a MAC without 12 hex digits', () => {
    const result = collarBody.safeParse({ mac: 'aa:bb' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('must have 12 hex digits');
  });

  it('normalizes the firmware version to X.Y.Z', () => {
    expect(collarBody.parse({ firmwareVersion: 'v1.2' }).firmwareVersion).toBe('1.2.0');
    expect(collarBody.safeParse({ firmwareVersion: '1.x' }).success).toBe(false);
  });

  it('accepts LoRa codes 1..255', () => {
    expect(collarBody.parse({ code: '255' }).code).toBe(255);
    expect(collarBody.safeParse({ code: '256' }).success).toBe(false);
    expect(collarBody.safeParse({ code: '0' }).success).toBe(false);
  });

  it('leaves empty fields out', () => {
    const result = collarBody.parse({ code: '', mac: '', description: '' });

    expect(Object.values(result).every((value) => value === undefined)).toBe(true);
  });
});
