import { describe, it, expect } from 'vitest';

import { batteryPercent, batteryLevel } from './battery.util';

describe('batteryPercent', () => {
  it.each([
    [4.3, 100],
    [4.2, 100],
    [3.8, 50],
    [3.75, 43], // interpolated between 3.7 (35%) and 3.8 (50%)
    [3.3, 0],
    [3.0, 0],
  ])('%f V -> %i%%', (voltage, percent) => {
    expect(batteryPercent(voltage)).toBe(percent);
  });
});

describe('batteryLevel', () => {
  it('uses the factory thresholds by default (low 3500, critical 3300 mV)', () => {
    expect(batteryLevel(3.6, null)).toBe('ok');
    expect(batteryLevel(3.4, null)).toBe('low');
    expect(batteryLevel(3.2, null)).toBe('critical');
  });

  it("uses the collar's thresholds", () => {
    expect(batteryLevel(3.6, { batteryLow: 3700, batteryCritical: 3400 })).toBe('low');
  });
});
