import { sql } from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import AppError from '../../shared/errors/AppError';
import { DATASETS, dimensionOf, catalogFor } from './explorer.catalog';
import { buildQuery, buildValuesQuery } from './explorer.engine';

// A query can't take the database for itself
const STATEMENT_TIMEOUT = '5s';
const MAX_VALUES = 500;

// Dataset the user can query, or an error
function datasetFor(id, permissions) {
  const dataset = DATASETS[id];

  if (!dataset) {
    throw new AppError('UNKNOWN_DATASET', 400);
  }

  if (!permissions.includes(dataset.permission)) {
    throw new AppError('FORBIDDEN', 403, `Missing permission: ${dataset.permission}`);
  }

  return dataset;
}

function checkAgainstCatalog(dataset, query) {
  const unknown = (code, list, exists) => {
    const missing = list.find((id) => !exists(id));
    if (missing !== undefined) {
      throw new AppError(code, 400, `${code}: ${missing}`);
    }
  };

  unknown('UNKNOWN_MEASURE', query.measures, (id) => Boolean(dataset.measures[id]));
  unknown('UNKNOWN_DIMENSION', [...query.dimensions, ...query.filters.map((f) => f.dimension)], (id) => Boolean(dimensionOf(dataset, id)));

  if (query.sort) {
    unknown('UNKNOWN_SORT', [query.sort.by], (id) => query.measures.includes(id) || query.dimensions.includes(id));
  }
}

// Read only, with a time limit
function runReadOnly(statement) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL statement_timeout = ${sql.raw(`'${STATEMENT_TIMEOUT}'`)}`);
    const { rows } = await tx.execute(statement);
    return rows;
  }, { accessMode: 'read only' });
}

const toNumber = (value) => (value === null ? null : Number(value));

const explorerService = {
  catalog(permissions) {
    return catalogFor(permissions);
  },

  // { columns: [{ id, label, kind: 'dimension' | 'measure', unit }], rows: [[...]], truncated }
  // A dimension cell is { value, label }; a measure cell, a number (or null).
  async run(query, permissions) {
    const dataset = datasetFor(query.dataset, permissions);
    checkAgainstCatalog(dataset, query);

    let rows;
    try {
      rows = await runReadOnly(buildQuery(dataset, query));
    } catch (err) {
      if (err.cause?.code === '57014') {
        throw new AppError('QUERY_TIMEOUT', 400, 'The query took too long: narrow the dates or the groups');
      }
      throw err;
    }

    const truncated = rows.length > query.limit;

    return {
      columns: [
        ...query.dimensions.map((id) => ({ id, label: dimensionOf(dataset, id).label, kind: 'dimension' })),
        ...query.measures.map((id) => ({
          id, label: dataset.measures[id].label, kind: 'measure', unit: dataset.measures[id].unit,
        })),
      ],
      rows: rows.slice(0, query.limit).map((row) => [
        ...query.dimensions.map((_, i) => ({ value: row[`d${i}`], label: row[`d${i}_label`] })),
        ...query.measures.map((_, i) => toNumber(row[`m${i}`])),
      ]),
      truncated,
    };
  },

  // Values of a dimension in the range, for the filters: [{ value, label }]
  async values({
    dataset: datasetId, dimension: dimensionId, dateFrom, dateTo,
  }, permissions) {
    const dataset = datasetFor(datasetId, permissions);
    const dimension = dimensionOf(dataset, dimensionId);

    if (!dimension) {
      throw new AppError('UNKNOWN_DIMENSION', 400, `UNKNOWN_DIMENSION: ${dimensionId}`);
    }

    return runReadOnly(buildValuesQuery(dataset, dimension, {
      dateFrom, dateTo, limit: MAX_VALUES,
    }));
  },
};

export default explorerService;
