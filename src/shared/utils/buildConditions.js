import {
  eq,
  gt,
  gte,
  lt,
  lte,
  inArray,
  isNull,
  isNotNull,
} from 'drizzle-orm';

export default function buildConditions(schema, where = {}) {
  return Object.entries(where).flatMap(([columnName, filter]) => {
    const column = schema[columnName];

    if (!column) {
      throw new Error(`Unknown filter field: ${columnName}`);
    }

    return Object.entries(filter)
      .map(([op, value]) => {
        let condition = null;
        switch (op) {
          case 'eq':
            condition = eq(column, value);
            break;

          case 'lt':
            condition = lt(column, value);
            break;

          case 'lte':
            condition = lte(column, value);
            break;

          case 'gt':
            condition = gt(column, value);
            break;

          case 'gte':
            condition = gte(column, value);
            break;

          case 'in':
            condition = inArray(column, value);
            break;

          case 'isNull':
            if (value) condition = isNull(column);
            break;

          case 'isNotNull':
            if (value) condition = isNotNull(column);
            break;

          default:
            throw new Error(`Operator not implemented: ${op}`);
        }

        return condition;
      })
      .filter((condition) => condition !== null);
  });
}
