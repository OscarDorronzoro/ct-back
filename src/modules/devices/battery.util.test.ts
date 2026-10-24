import { describe, it, expect } from 'vitest';

import { batteryPercent, batteryLevel } from './battery.util';

describe('batteryPercent', () => {
  it.each([
    [4.2, 100],
    [3.92, 100],
    [3.8, 83],
    [3.64, 55], // interpolated between 3.66 (62%) and 3.62 (47%)
    [3.4, 2],
    [3.3, 0],
  ])('%f V -> %i%%', (voltage, percent) => {
    expect(batteryPercent(voltage)).toBe(percent);
  });
});

describe('batteryLevel', () => {
  it('uses the factory thresholds by default (low 3550, critical 3450 mV)', () => {
    expect(batteryLevel(3.6, null)).toBe('ok');
    expect(batteryLevel(3.5, null)).toBe('low');
    expect(batteryLevel(3.42, null)).toBe('critical');
  });

  it("uses the collar's thresholds", () => {
    expect(batteryLevel(3.6, { batteryLow: 3700, batteryCritical: 3400 })).toBe('low');
  });
});
