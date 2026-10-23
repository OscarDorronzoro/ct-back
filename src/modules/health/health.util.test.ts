import { describe, it, expect } from 'vitest';

import { withdrawalUntil, healthSummary } from './health.util';

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe('withdrawalUntil', () => {
  it('counts the withdrawal days from the application', () => {
    expect(withdrawalUntil(day('2026-10-01'), 30)).toEqual(day('2026-10-31'));
  });

  it('counts from the last day of a treatment of several days', () => {
    // Applied on the 1st, 2nd and 3rd: 10 days from the 3rd
    expect(withdrawalUntil(day('2026-10-01'), 10, 3)).toEqual(day('2026-10-13'));
  });

  it('is null without withdrawal', () => {
    expect(withdrawalUntil(day('2026-10-01'), 0)).toBeNull();
  });
});

const aftosa = { id: 1, name: 'Aftosa', type: 'vaccine' };
const brucelosis = { id: 2, name: 'Brucelosis', type: 'vaccine' };

const vaccination = (id: number, at: string, product: object, nextDoseOn: string | null) => ({
  id,
  type: 'vaccination',
  occurredAt: day(at),
  voided: null,
  details: {
    product, nextDoseOn, meatWithdrawalUntil: null, milkWithdrawalUntil: null,
  },
});

type Until = string | null;

const treatment = (id: number, at: string, meatUntil: Until, milkUntil: Until, voided = false) => ({
  id,
  type: 'treatment',
  occurredAt: day(at),
  voided: voided ? { reason: 'error' } : null,
  details: {
    meatWithdrawalUntil: meatUntil && day(meatUntil),
    milkWithdrawalUntil: milkUntil && day(milkUntil),
  },
});

const weighing = (id: number, at: string, kg: number, voided = false) => ({
  id, type: 'weighing', occurredAt: day(at), voided: voided ? { reason: 'error' } : null, details: { weightKg: kg },
});

const now = day('2026-10-22');

describe('healthSummary', () => {
  it('is empty without events', () => {
    expect(healthSummary([], now)).toEqual({
      withdrawal: { meatUntil: null, milkUntil: null },
      lastWeight: null,
      nextDoses: [],
    });
  });

  it('takes the latest withdrawal still running, for meat and milk apart', () => {
    const { withdrawal } = healthSummary([
      treatment(1, '2026-10-01', '2026-11-10', '2026-10-05'),
      treatment(2, '2026-10-15', '2026-10-30', '2026-10-25'),
    ], now);

    expect(withdrawal).toEqual({ meatUntil: day('2026-11-10'), milkUntil: day('2026-10-25') });
  });

  it('ignores voided events', () => {
    const summary = healthSummary([
      treatment(1, '2026-10-15', '2026-11-10', null, true),
      weighing(2, '2026-10-01', 410),
      weighing(3, '2026-10-20', 430, true),
    ], now);

    expect(summary.withdrawal.meatUntil).toBeNull();
    expect(summary.lastWeight).toEqual({ kg: 410, at: day('2026-10-01') });
  });

  it('asks for the booster of the latest vaccination of each vaccine, oldest first', () => {
    const { nextDoses } = healthSummary([
      vaccination(1, '2026-03-01', aftosa, '2026-09-01'),
      vaccination(2, '2026-09-05', aftosa, '2027-03-05'),
      vaccination(3, '2026-04-01', brucelosis, '2026-10-01'),
    ], now);

    expect(nextDoses).toEqual([
      {
        product: brucelosis, dueOn: '2026-10-01', overdue: true, eventId: 3,
      },
      {
        product: aftosa, dueOn: '2027-03-05', overdue: false, eventId: 2,
      },
    ]);
  });

  it('has no booster when the latest vaccination does not ask for one', () => {
    const { nextDoses } = healthSummary([
      vaccination(1, '2026-03-01', aftosa, '2026-09-01'),
      vaccination(2, '2026-09-05', aftosa, null),
    ], now);

    expect(nextDoses).toEqual([]);
  });
});
