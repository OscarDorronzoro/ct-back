import { describe, it, expect } from 'vitest';

import { createCommandBody, collarParamsSchema, commandResultsBody } from './command.validator';

describe('collarParamsSchema', () => {
  it('accepts known params within their range', () => {
    expect(collarParamsSchema.safeParse({ gpsOn: 30, sendPeriod: 120 }).success).toBe(true);
  });

  it('rejects unknown params', () => {
    expect(collarParamsSchema.safeParse({ foo: 1 }).success).toBe(false);
  });

  it('rejects values out of range', () => {
    expect(collarParamsSchema.safeParse({ gpsOn: 5 }).success).toBe(false);
  });

  it('rejects an empty object', () => {
    expect(collarParamsSchema.safeParse({}).success).toBe(false);
  });

  it('requires batteryCritical < batteryLow only when both are sent', () => {
    expect(collarParamsSchema.safeParse({ batteryCritical: 3600 }).success).toBe(true);

    const result = collarParamsSchema.safeParse({ batteryLow: 3500, batteryCritical: 3600 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['batteryCritical']);
  });
});

describe('createCommandBody', () => {
  it('accepts a command for all collars', () => {
    expect(createCommandBody.parse({ type: 'reboot', target: 'all' })).toEqual({ type: 'reboot', target: 'all' });
  });

  it('removes duplicated collar ids', () => {
    const body = createCommandBody.parse({ type: 'diag', target: { collarIds: [1, 1, 2] } });

    expect(body.target).toEqual({ collarIds: [1, 2] });
  });

  it('rejects an empty collar list', () => {
    expect(createCommandBody.safeParse({ type: 'diag', target: { collarIds: [] } }).success).toBe(false);
  });

  it('rejects unknown types', () => {
    expect(createCommandBody.safeParse({ type: 'assignCode', target: 'all' }).success).toBe(false);
  });

  it('requires the fields of each type', () => {
    expect(createCommandBody.safeParse({ type: 'zone', target: 'all', zone: 1 }).success).toBe(false);
    expect(createCommandBody.safeParse({
      type: 'zone', target: 'all', zone: 1, zoneId: 5,
    }).success).toBe(true);
    expect(createCommandBody.safeParse({
      type: 'zone', target: 'all', zone: 4, zoneId: 5,
    }).success).toBe(false);
  });

  it('accepts zoneClear for one slot or all of them', () => {
    expect(createCommandBody.safeParse({ type: 'zoneClear', target: 'all', zone: 'all' }).success).toBe(true);
    expect(createCommandBody.safeParse({ type: 'zoneClear', target: 'all', zone: 3 }).success).toBe(true);
  });

  it('allows ota without version (latest firmware)', () => {
    expect(createCommandBody.safeParse({ type: 'ota', target: 'all' }).success).toBe(true);
    expect(createCommandBody.safeParse({ type: 'ota', target: 'all', version: 'v1' }).success).toBe(false);
  });
});

describe('commandResultsBody', () => {
  it('accepts the known results', () => {
    expect(commandResultsBody.safeParse({ results: [{ id: 1, result: 'noAnswer' }] }).success).toBe(true);
    expect(commandResultsBody.safeParse({ results: [{ id: 1, result: 'meh' }] }).success).toBe(false);
  });
});
