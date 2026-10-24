// Collar configuration. Times of day are seconds since 00:00 UTC.
const COLLAR_PARAMS = {
  dayTime: { min: 0, max: 86399, factory: 39600 },
  nightTime: { min: 0, max: 86399, factory: 0 },
  gpsOn: { min: 10, max: 3600, factory: 60 },
  gpsOff: { min: 10, max: 86400, factory: 60 },
  sendPeriod: { min: 30, max: 86400, factory: 120 },
  txHold: { min: 60, max: 86400, factory: 360 },
  minDistance: { min: 0, max: 10000, factory: 20 },
  diagPeriod: { min: 10, max: 10080, factory: 360 },
  nightMaxSleep: { min: 5, max: 127, factory: 60 },
  buzzer: { min: 0, max: 1, factory: 1 },
  zoneExitMargin: { min: 0, max: 200, factory: 10 },
  zoneExitFixes: { min: 1, max: 60, factory: 5 },
  outsideSendPeriod: { min: 10, max: 3600, factory: 60 },
  outsideGpsMin: { min: 0, max: 240, factory: 10 },
  buzzerMaxSec: { min: 0, max: 600, factory: 60 },
  zoneWatchMax: { min: 30, max: 1800, factory: 180 },
  // From the measured discharge curve (battery.util): about 5 and 2 days left without sun. The
  // collar stops at about 3300 mV, so a lower critical threshold would never be reached.
  batteryLow: { min: 3000, max: 4200, factory: 3550 },
  batteryCritical: { min: 2900, max: 4000, factory: 3450 },
  outsideDayTime: { min: 0, max: 86399, factory: 32400 },
  outsideNightTime: { min: 0, max: 86399, factory: 7200 },
};

export const FACTORY_PARAMS = Object.fromEntries(
  Object.entries(COLLAR_PARAMS).map(([name, { factory }]) => [name, factory]),
);

export default COLLAR_PARAMS;
