import { describe, it, expect } from 'vitest';

import {
  id, idList, optionalField, dateRangeQuery, firmwareVersionSchema,
} from './common';

describe('id', () => {
  it('coerces route params to numbers', () => {
    expect(id.parse('42')).toBe(42);
  });

  it.each(['0', '-3', '1.5', 'abc', ''])('rejects %j', (value) => {
    expect(id.safeParse(value).success).toBe(false);
  });
});

describe('idList', () => {
  it('removes duplicates', () => {
    expect(idList.parse(['2', '2', '3'])).toEqual([2, 3]);
  });

  it('takes a single multipart value as a list', () => {
    expect(idList.parse('4')).toEqual([4]);
  });

  it('takes an empty value as an empty list (a form cannot send [])', () => {
    expect(idList.parse('')).toEqual([]);
  });
});

describe('optionalField', () => {
  const schema = optionalField(id);

  it.each(['', null, undefined])('treats %j as not sent', (value) => {
    expect(schema.parse(value)).toBeUndefined();
  });

  it('validates a present value', () => {
    expect(schema.parse('7')).toBe(7);
    expect(schema.safeParse('x').success).toBe(false);
  });
});

describe('dateRangeQuery', () => {
  const defaultFrom = new Date('2026-01-01T00:00:00Z');
  const schema = dateRangeQuery(() => defaultFrom);

  it('uses the defaults when the dates are missing or empty', () => {
    const before = Date.now();
    const { dateFrom, dateTo } = schema.parse({ dateFrom: '', dateTo: undefined });

    expect(dateFrom).toEqual(defaultFrom);
    expect(dateTo.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('parses ISO dates', () => {
    const result = schema.parse({ dateFrom: '2026-10-13T03:00:00Z', dateTo: '2026-10-14T03:00:00Z' });

    expect(result.dateFrom.toISOString()).toBe('2026-10-13T03:00:00.000Z');
    expect(result.dateTo.toISOString()).toBe('2026-10-14T03:00:00.000Z');
  });

  it('rejects an invalid date', () => {
    const result = schema.safeParse({ dateTo: 'nope' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ['dateTo'], message: 'must be a valid date' });
  });

  it('rejects dateFrom after dateTo', () => {
    const result = schema.safeParse({ dateFrom: '2026-10-14', dateTo: '2026-10-13' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ['dateFrom'], message: 'must be before dateTo' });
  });
});

describe('firmwareVersionSchema', () => {
  it('accepts X.Y.Z only', () => {
    expect(firmwareVersionSchema.safeParse('1.2.3').success).toBe(true);
    expect(firmwareVersionSchema.safeParse('v1.2').success).toBe(false);
  });
});
