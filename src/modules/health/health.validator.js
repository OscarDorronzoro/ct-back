import { z } from 'zod';

import {
  id, idParams, optionalField, date, nonEmptyString,
} from '../../shared/validation/common';
import { EVENT_TYPES, PRODUCT_TYPES, ROUTES } from './health.constants';

// Events are recorded after they happen; a few minutes of clock difference are allowed
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export const cowParams = idParams('cowId');
export const eventParams = idParams('eventId');
export const productParams = idParams('productId');

const text = optionalField(z.string().trim());

const common = {
  occurredAt: date.refine(
    (value) => value.getTime() <= Date.now() + MAX_CLOCK_SKEW_MS,
    'must not be in the future',
  ),
  notes: text,
};

const application = {
  productId: id,
  dose: text,
  route: optionalField(z.enum(ROUTES)),
};

const event = (type, fields) => z.object({ type: z.literal(type), ...common, ...fields });

export const createEventBody = z.discriminatedUnion('type', [
  event(EVENT_TYPES.VACCINATION, {
    ...application,
    batch: text,
    nextDoseOn: optionalField(z.iso.date()),
  }).refine(
    ({ nextDoseOn, occurredAt }) => !nextDoseOn || new Date(nextDoseOn) > occurredAt,
    { message: 'must be after the vaccination', path: ['nextDoseOn'] },
  ),
  event(EVENT_TYPES.TREATMENT, {
    ...application,
    diagnosis: text,
    durationDays: z.number().int().min(1).max(365)
      .default(1),
  }),
  event(EVENT_TYPES.EXAMINATION, {
    finding: text,
    temperature: optionalField(z.number().min(30).max(45)),
    bodyCondition: optionalField(z.number().min(1).max(5).multipleOf(0.25)),
  }).refine(
    (e) => [e.finding, e.temperature, e.bodyCondition, e.notes].some((v) => v !== undefined),
    { message: 'needs a finding, a measure or notes', path: ['finding'] },
  ),
  event(EVENT_TYPES.WEIGHING, {
    weightKg: z.number().positive().max(2000),
  }),
]);

export const voidEventBody = z.object({
  reason: nonEmptyString,
});

const withdrawalDays = z.number().int().min(0).max(3650);

export const createProductBody = z.object({
  name: nonEmptyString.transform((value) => value.trim()),
  type: z.enum(Object.values(PRODUCT_TYPES)),
  meatWithdrawalDays: withdrawalDays.default(0),
  milkWithdrawalDays: withdrawalDays.default(0),
});

// The type stays: events already recorded with the product depend on it
export const updateProductBody = z.object({
  name: nonEmptyString.transform((value) => value.trim()).optional(),
  meatWithdrawalDays: withdrawalDays.optional(),
  milkWithdrawalDays: withdrawalDays.optional(),
  active: z.boolean().optional(),
});

export const productListQuery = z.object({
  active: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
});
