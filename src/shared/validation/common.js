import { z } from 'zod';

import firmwareVersion from '../../modules/devices/firmwareVersion.util';

// Positive integer id. Route params, query strings and multipart fields arrive as strings.
export const id = z.coerce.number().int().positive();

// { [name]: id }, for routes like /cows/:cowId
export const idParams = (name) => z.object({ [name]: id });

// Optional form field: an empty value counts as not sent
export function optionalField(schema) {
  return z.preprocess((value) => (value === '' || value === null ? undefined : value), schema.optional());
}

// ISO date or datetime
export const date = z.coerce.date({ error: 'must be a valid date' });

// Midnight (server time) of the current day
export const startOfToday = () => new Date(new Date().setHours(0, 0, 0, 0));

const emptyToUndefined = (value) => (value === '' ? undefined : value);

// ?dateFrom=&dateTo= (ISO). Missing: dateTo is now, dateFrom comes from defaultFrom().
// dateFrom must be before dateTo. fields: other query fields validated along with the dates.
export function dateRangeQuery(defaultFrom, fields = {}) {
  return z.object({
    dateFrom: z.preprocess(emptyToUndefined, date.default(defaultFrom)),
    dateTo: z.preprocess(emptyToUndefined, date.default(() => new Date())),
    ...fields,
  }).refine(
    ({ dateFrom, dateTo }) => dateFrom < dateTo,
    { message: 'must be before dateTo', path: ['dateFrom'] },
  );
}

export const nonEmptyString = z.string().refine((value) => value.trim().length > 0, 'must not be empty');

// Positive ids, duplicates removed. A single value (one multipart field) is taken as a list,
// and an empty one as an empty list: a multipart form can't send [].
export const idList = z.preprocess(
  (value) => {
    if (value === '') {
      return [];
    }
    return value === undefined || Array.isArray(value) ? value : [value];
  },
  z.array(id).transform((ids) => [...new Set(ids)]),
);

export const firmwareVersionSchema = z.string().refine(firmwareVersion.isValid, 'must be X.Y.Z');
