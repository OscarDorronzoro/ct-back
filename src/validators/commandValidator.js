import { z } from 'zod';

import COLLAR_PARAMS from '../utils/collarParams';
import { COMMAND_RESULTS, ZONE_SLOTS } from '../utils/rfConstants';
import {
  id, idParams, optionalField, firmwareVersionSchema,
} from './common';

const MAX_LIST_LIMIT = 500;

export const commandParams = idParams('commandId');

export const commandListQuery = z.object({
  collarId: optionalField(id),
  limit: optionalField(id.transform((value) => Math.min(value, MAX_LIST_LIMIT))),
});

// Collar configuration, from the ranges in COLLAR_PARAMS. At least one; unknown names rejected.
// batteryCritical < batteryLow is only checked when both are sent: the current values may differ
// between collars, and the collar rejects the change (badParams) if it isn't met.
export const collarParamsSchema = z.strictObject(Object.fromEntries(
  Object.entries(COLLAR_PARAMS).map(([name, { min, max }]) => [
    name,
    z.number().int().min(min).max(max)
      .optional(),
  ]),
))
  .refine((params) => Object.keys(params).length > 0, 'must not be empty')
  .refine(
    (params) => params.batteryCritical === undefined || params.batteryLow === undefined
      || params.batteryCritical < params.batteryLow,
    { message: 'must be lower than batteryLow', path: ['batteryCritical'] },
  );

const zoneSlot = z.number().int().min(0).max(ZONE_SLOTS - 1);

// 'all' or { collarIds: [...] }
const target = z.union([
  z.literal('all'),
  z.object({
    collarIds: z.array(z.number().int().positive()).min(1)
      .transform((ids) => [...new Set(ids)]),
  }),
]);

const command = (type, fields = {}) => z.object({ type: z.literal(type), target, ...fields });

// Fields depend on the type
export const createCommandBody = z.discriminatedUnion('type', [
  command('params', { params: collarParamsSchema }),
  command('resetParams'),
  command('diag'),
  command('reboot'),
  command('zone', { zone: zoneSlot, zoneId: z.number().int().positive() }),
  command('zoneClear', { zone: z.union([zoneSlot, z.literal('all')]) }),
  // Without version: the latest firmware
  command('ota', { version: firmwareVersionSchema.nullish() }),
  command('otaCancel'),
]);

// Gateway: results of the commands it was handed (id = command target id)
export const commandResultsBody = z.object({
  results: z.array(z.object({
    id: z.number().int().positive(),
    result: z.enum(COMMAND_RESULTS),
  })),
});
