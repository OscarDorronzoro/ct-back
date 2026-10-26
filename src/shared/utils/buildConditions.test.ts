import { describe, it, expect } from 'vitest';
import { and } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core/dialect';
import { pgTable, integer, timestamp } from 'drizzle-orm/pg-core';

import buildConditions from './buildConditions';

const cows = pgTable('cows', {
  id: integer(),
  breedId: integer('breed_id'),
  deletedAt: timestamp('deleted_at'),
});

// The WHERE the conditions make, with its parameters
const where = (filter: object) => (
  new PgDialect().sqlToQuery(and(...buildConditions(cows, filter))!)
);

describe('buildConditions', () => {
  it('makes one condition per operator, with the values as parameters', () => {
    const query = where({ id: { gte: 3, lt: 10 }, breedId: { eq: 2 } });

    expect(query.sql).toBe('("cows"."id" >= $1 and "cows"."id" < $2 and "cows"."breed_id" = $3)');
    expect(query.params).toEqual([3, 10, 2]);
  });

  it('filters by a list of values', () => {
    const query = where({ id: { in: [1, 2, 3] } });

    expect(query.sql).toBe('"cows"."id" in ($1, $2, $3)');
    expect(query.params).toEqual([1, 2, 3]);
  });

  it('checks null only when asked with true', () => {
    expect(where({ deletedAt: { isNull: true } }).sql).toBe('"cows"."deleted_at" is null');
    expect(where({ deletedAt: { isNotNull: true } }).sql).toBe('"cows"."deleted_at" is not null');
    expect(buildConditions(cows, { deletedAt: { isNull: false } })).toEqual([]);
  });

  it('makes no conditions without a filter', () => {
    expect(buildConditions(cows)).toEqual([]);
  });

  it('refuses unknown columns and operators (they would be silently ignored filters)', () => {
    expect(() => buildConditions(cows, { name: { eq: 'x' } })).toThrow('Unknown filter field: name');
    expect(() => buildConditions(cows, { id: { like: 'x' } })).toThrow('Operator not implemented: like');
  });
});
