import { FACTORY_PARAMS } from './collarParams.constants';

// Approximate LiPo discharge curve (single cell, at rest): [volts, percent]
const CURVE = [
  [4.2, 100], [4.1, 90], [4.0, 80], [3.9, 65], [3.8, 50],
  [3.7, 35], [3.6, 20], [3.5, 10], [3.4, 5], [3.3, 0],
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
