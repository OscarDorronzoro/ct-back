import { FACTORY_PARAMS } from './collarParams.constants';

// Discharge curve measured on a full cycle of a collar without solar panel (October 2026): with a
// steady daily consumption, the charge left is the fraction of the cycle left (see
// scripts/battery_curve.sql). It went from 3.90 V to stopping at about 3.40 V in 19 days.
// 0 % is when the collar stops working, not an empty cell. [volts, percent]
const CURVE = [
  [3.92, 100], [3.86, 92], [3.80, 83], [3.72, 72], [3.66, 62], [3.62, 47],
  [3.58, 32], [3.52, 22], [3.46, 12], [3.40, 2], [3.38, 0],
];

export function batteryPercent(voltage) {
  if (voltage >= CURVE[0][0]) {
    return 100;
  }

  for (let i = 1; i < CURVE.length; i += 1) {
    const [v1, p1] = CURVE[i - 1];
    const [v2, p2] = CURVE[i];

    if (voltage >= v2) {
      return Math.round(p2 + ((voltage - v2) / (v1 - v2)) * (p1 - p2));
    }
  }

  return 0;
}

// ok | low | critical, with the collar's thresholds (mV)
export function batteryLevel(voltage, params) {
  const { batteryLow, batteryCritical } = { ...FACTORY_PARAMS, ...params };
  const mv = voltage * 1000;

  if (mv < batteryCritical) {
    return 'critical';
  }

  return mv < batteryLow ? 'low' : 'ok';
}
