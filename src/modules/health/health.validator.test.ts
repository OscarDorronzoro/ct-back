import { describe, it, expect } from 'vitest';

import { createEventBody, createProductBody } from './health.validator';

const base = { occurredAt: '2026-10-20T10:00:00Z' };

describe('createEventBody', () => {
  it('parses a vaccination, leaving empty fields out', () => {
    const event = createEventBody.parse({
      ...base, type: 'vaccination', productId: 3, dose: '2 ml', batch: '', route: 'subcutaneous', nextDoseOn: '2027-04-20',
    });

    expect(event).toMatchObject({
      type: 'vaccination', productId: 3, dose: '2 ml', nextDoseOn: '2027-04-20',
    });
    expect(event).not.toHaveProperty('batch', '');
  });

  it('rejects a booster before the vaccination', () => {
    expect(createEventBody.safeParse({
      ...base, type: 'vaccination', productId: 3, nextDoseOn: '2026-10-01',
    }).success).toBe(false);
  });

  it('gives a treatment one day by default', () => {
    expect(createEventBody.parse({ ...base, type: 'treatment', productId: 4 })).toMatchObject({ durationDays: 1 });
  });

  it('needs something in an examination', () => {
    expect(createEventBody.safeParse({ ...base, type: 'examination' }).success).toBe(false);
    expect(createEventBody.safeParse({ ...base, type: 'examination', temperature: 39.2 }).success).toBe(true);
  });

  it('takes body condition from 1 to 5 in quarters', () => {
    const exam = (bodyCondition: number) => createEventBody.safeParse({ ...base, type: 'examination', bodyCondition });

    expect(exam(3.25).success).toBe(true);
    expect(exam(3.3).success).toBe(false);
    expect(exam(6).success).toBe(false);
  });

  it('rejects a weight out of range and an unknown type', () => {
    expect(createEventBody.safeParse({ ...base, type: 'weighing', weightKg: 0 }).success).toBe(false);
    expect(createEventBody.safeParse({ ...base, type: 'surgery' }).success).toBe(false);
  });

  it('rejects events in the future', () => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    expect(createEventBody.safeParse({ type: 'weighing', occurredAt: tomorrow, weightKg: 400 }).success).toBe(false);
  });
});

describe('createProductBody', () => {
  it('trims the name and has no withdrawal by default', () => {
    expect(createProductBody.parse({ name: ' Ivermectina 1% ', type: 'antiparasitic' })).toEqual({
      name: 'Ivermectina 1%', type: 'antiparasitic', meatWithdrawalDays: 0, milkWithdrawalDays: 0,
    });
  });

  it('rejects unknown types and negative days', () => {
    expect(createProductBody.safeParse({ name: 'X', type: 'food' }).success).toBe(false);
    expect(createProductBody.safeParse({ name: 'X', type: 'drug', meatWithdrawalDays: -1 }).success).toBe(false);
  });
});
