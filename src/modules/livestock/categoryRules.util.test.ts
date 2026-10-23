import { describe, it, expect } from 'vitest';

import { expectedCategory, ageInMonths } from './categoryRules.util';

const now = new Date('2026-10-22T12:00:00');
const born = (monthsAgo: number) => {
  const date = new Date(now);
  date.setMonth(date.getMonth() - monthsAgo);
  return date;
};

describe('ageInMonths', () => {
  it('counts whole months', () => {
    expect(ageInMonths(new Date('2025-10-22T12:00:00'), now)).toBe(12);
    expect(ageInMonths(new Date('2025-10-23T12:00:00'), now)).toBe(11);
  });
});

describe('expectedCategory', () => {
  const female = (months: number | null, current: string | null) => expectedCategory({
    sex: 'female', birthDate: months === null ? null : born(months), castrated: false, current,
  }, now);
  type Months = number | null;
  const male = (months: Months, current: string | null, castrated = false) => expectedCategory({
    sex: 'male', birthDate: months === null ? null : born(months), castrated, current,
  }, now);

  it('follows the age of a female: ternera, then vaquillona', () => {
    expect(female(6, null)).toBe('Ternera');
    expect(female(6, 'Ternera')).toBeNull();
    expect(female(13, 'Ternera')).toBe('Vaquillona');
    expect(female(40, 'Vaquillona')).toBeNull();
  });

  it('never turns a vaquillona into a vaca by age (first calving, manual)', () => {
    expect(female(60, 'Vaquillona')).toBeNull();
    expect(female(60, 'Vaca')).toBeNull();
  });

  it('follows the age of an entire male: ternero, torito, toro', () => {
    expect(male(6, null)).toBe('Ternero');
    expect(male(13, 'Ternero')).toBe('Torito');
    expect(male(25, 'Torito')).toBe('Toro');
  });

  it('follows the steer track once castrated', () => {
    expect(male(6, 'Ternero', true)).toBeNull();
    expect(male(13, 'Ternero', true)).toBe('Novillito');
    expect(male(25, 'Novillito', true)).toBe('Novillo');
  });

  it('moves a male to the other track at the same step on castration, or when it is voided', () => {
    expect(male(18, 'Torito', true)).toBe('Novillito');
    expect(male(30, 'Toro', true)).toBe('Novillo');
    expect(male(18, 'Novillito', false)).toBe('Torito');
  });

  it('never goes back within a track (a category set ahead of the age stays)', () => {
    expect(female(6, 'Vaquillona')).toBeNull();
    expect(male(6, 'Torito')).toBeNull();
  });

  it('without birth date, only castration changes the category', () => {
    expect(male(null, 'Torito', true)).toBe('Novillito');
    expect(male(null, 'Torito')).toBeNull();
    expect(male(null, null)).toBeNull();
  });

  it('does nothing without sex', () => {
    expect(expectedCategory({
      sex: null, birthDate: born(30), castrated: false, current: null,
    }, now)).toBeNull();
  });
});
