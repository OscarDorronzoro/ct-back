import { sql } from 'drizzle-orm';

import { dimensionOf, joinSql } from './explorer.catalog';

// Chosen order, or along the dates, or the first measure from the highest
function orderBy(dataset, query, dims) {
  const column = (id) => {
    const dimension = query.dimensions.indexOf(id);
    if (dimension >= 0) {
      return sql.identifier(`d${dimension}`);
    }
    return sql.identifier(`m${query.measures.indexOf(id)}`);
  };

  if (query.sort) {
    const direction = query.sort.direction === 'asc' ? sql`ASC` : sql`DESC`;
    return sql`${column(query.sort.by)} ${direction} NULLS LAST`;
  }

  if (dims[0]?.kind === 'date') {
    return sql.join(dims.map((_, i) => sql.identifier(`d${i}`)), sql`, `);
  }

  return sql`${sql.identifier('m0')} DESC NULLS LAST`;
}

// SQL of an explorer query, only from pieces of the catalog. query is already validated against
// the catalog (explorer.service): { measures, dimensions, filters, dateFrom, dateTo, sort, limit }.
// Columns: d0, d1 (dimension values), d0_label, d1_label, then m0, m1... (measures).
export function buildQuery(dataset, query) {
  const { date } = dataset;
  const dims = query.dimensions.map((id) => dimensionOf(dataset, id));
  const filterDims = query.filters.map((f) => dimensionOf(dataset, f.dimension));

  const joinNames = [...new Set([...dims, ...filterDims].flatMap((d) => d.joins ?? []))];
  const joins = joinNames.map((name) => joinSql(name, date));

  const select = [
    ...dims.flatMap((d, i) => [
      sql`${d.value(date)} AS ${sql.identifier(`d${i}`)}`,
      sql`${(d.text ?? d.value)(date)} AS ${sql.identifier(`d${i}_label`)}`,
    ]),
    ...query.measures.map((id, i) => sql`round((${dataset.measures[id].expr})::numeric, 2) AS ${sql.identifier(`m${i}`)}`),
  ];

  const where = [
    sql`${date} >= ${query.dateFrom}::date`,
    sql`${date} <= ${query.dateTo}::date`,
    ...query.filters.map((f, i) => sql`(${filterDims[i].value(date)})::text IN (${sql.join(
      f.values.map((v) => sql`${String(v)}`),
      sql`, `,
    )})`),
  ];

  // Grouped by every dimension column (value and label), by position
  const groupBy = dims.length
    ? sql` GROUP BY ${sql.raw(dims.flatMap((_, i) => [2 * i + 1, 2 * i + 2]).join(', '))}`
    : sql``;

  return sql`SELECT ${sql.join(select, sql`, `)}
    FROM ${dataset.from}
    ${sql.join(joins, sql` `)}
    WHERE ${sql.join(where, sql` AND `)}${groupBy}
    ORDER BY ${orderBy(dataset, query, dims)}
    LIMIT ${query.limit + 1}`;
}

// Distinct values of a dimension (for the filters), by label
export function buildValuesQuery(dataset, dimension, { dateFrom, dateTo, limit }) {
  const { date } = dataset;
  const joins = (dimension.joins ?? []).map((name) => joinSql(name, date));

  return sql`SELECT DISTINCT ${dimension.value(date)} AS value, ${(dimension.text ?? dimension.value)(date)} AS label
    FROM ${dataset.from}
    ${sql.join(joins, sql` `)}
    WHERE ${date} >= ${dateFrom}::date AND ${date} <= ${dateTo}::date
    ORDER BY 2
    LIMIT ${limit}`;
}
