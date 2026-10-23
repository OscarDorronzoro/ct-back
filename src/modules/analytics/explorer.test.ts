import { describe, it, expect } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';

import { DATASETS, dimensionOf, catalogFor } from './explorer.catalog';
import { buildQuery } from './explorer.engine';
import { explorerQueryBody } from './explorer.validator';

const render = (statement: Parameters<PgDialect['sqlToQuery']>[0]) => new PgDialect().sqlToQuery(statement);

const query = (overrides = {}) => explorerQueryBody.parse({
  dataset: 'activity',
  measures: ['distancePerCowKm'],
  dateFrom: '2026-10-01',
  dateTo: '2026-10-22',
  ...overrides,
});

describe('explorer catalog', () => {
  it('resolves every dimension of every dataset', () => {
    Object.values(DATASETS).forEach((dataset) => {
      dataset.dimensions.forEach((id) => expect(dimensionOf(dataset, id), id).toBeDefined());
    });
  });

  it('shows each user only the datasets of their permissions', () => {
    const ids = (permissions: string[]) => catalogFor(permissions).map((d) => d.id);

    expect(ids(['map:read'])).toEqual(['activity', 'zoneVisits', 'stops', 'weather']);
    expect(ids(['map:read', 'health:read', 'collars:read'])).toContain('health');
    expect(ids(['map:read', 'collars:read'])).toContain('battery');
    expect(ids([])).toEqual([]);
  });
});

describe('buildQuery', () => {
  it('joins only what the dimensions need', () => {
    const { sql } = render(buildQuery(DATASETS.activity, query({ dimensions: ['week'] })));

    expect(sql).not.toContain('JOIN');
    expect(sql).toContain('GROUP BY 1, 2');
  });

  it('groups by two dimensions, with their joins', () => {
    const { sql } = render(buildQuery(DATASETS.activity, query({ dimensions: ['month', 'category'] })));

    expect(sql).toContain('LEFT JOIN dw.dim_category k');
    expect(sql).toContain('GROUP BY 1, 2, 3, 4');
  });

  it('sends the values of the user as parameters, never in the SQL', () => {
    const evil = "x'); DROP TABLE cows; --";
    const { sql, params } = render(buildQuery(DATASETS.activity, query({
      filters: [{ dimension: 'cow', values: [evil, 7] }],
    })));

    expect(sql).not.toContain('DROP');
    expect(params).toEqual(expect.arrayContaining([evil, '7', '2026-10-01', '2026-10-22']));
  });

  it('orders along the dates, or by the first measure', () => {
    expect(render(buildQuery(DATASETS.activity, query({ dimensions: ['day'] }))).sql).toContain('ORDER BY "d0"');
    expect(render(buildQuery(DATASETS.activity, query({ dimensions: ['cow'] }))).sql).toContain('ORDER BY "m0" DESC');
  });

  it('asks for one row more than the limit, to know if it was cut', () => {
    const { params } = render(buildQuery(DATASETS.activity, query({ limit: 50 })));

    expect(params.at(-1)).toBe(51);
  });
});

describe('explorerQueryBody', () => {
  it('needs a measure and at most 2 dimensions', () => {
    expect(() => query({ measures: [] })).toThrow();
    expect(() => query({ dimensions: ['day', 'cow', 'sex'] })).toThrow();
  });

  it('rejects a range of more than 3 years or upside down', () => {
    expect(() => query({ dateFrom: '2020-01-01' })).toThrow();
    expect(() => query({ dateFrom: '2026-10-23' })).toThrow();
  });
});
