import { z } from 'zod';

// Shape of an explorer query. Whether the dataset, measures and dimensions exist (and the user
// can use them) is checked against the catalog in explorer.service.
const MAX_RANGE_DAYS = 3 * 366;
const DAY_MS = 24 * 3600 * 1000;

const unique = (list) => [...new Set(list)];
const day = z.iso.date();

const dateRange = (schema) => schema
  .refine(({ dateFrom, dateTo }) => dateFrom <= dateTo, { message: 'must be before dateTo', path: ['dateFrom'] })
  .refine(
    ({ dateFrom, dateTo }) => (new Date(dateTo) - new Date(dateFrom)) / DAY_MS <= MAX_RANGE_DAYS,
    { message: 'at most 3 years', path: ['dateFrom'] },
  );

export const explorerQueryBody = dateRange(z.object({
  dataset: z.string(),
  measures: z.array(z.string()).min(1).max(4).transform(unique),
  dimensions: z.array(z.string()).max(2).default([]).transform(unique),
  filters: z.array(z.object({
    dimension: z.string(),
    values: z.array(z.union([z.string(), z.number()])).min(1).max(200),
  })).max(5).default([]),
  dateFrom: day,
  dateTo: day,
  sort: z.object({ by: z.string(), direction: z.enum(['asc', 'desc']) }).optional(),
  limit: z.number().int().min(1).max(5000)
    .default(1000),
}));

export const explorerValuesQuery = dateRange(z.object({
  dataset: z.string(),
  dimension: z.string(),
  dateFrom: day,
  dateTo: day,
}));
