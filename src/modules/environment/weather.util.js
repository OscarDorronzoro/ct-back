import { MAX_PAST_DAYS } from './openMeteo.client';

const DAY_MS = 24 * 3600 * 1000;

// Days to ask for so the stored series has no gaps: from the last stored hour (one more day,
// so recent hours get the provider's corrections), or as far back as allowed if there is none.
export function pastDaysToFetch(lastObservedAt, now) {
  if (!lastObservedAt) {
    return MAX_PAST_DAYS;
  }

  const days = Math.ceil((now - lastObservedAt) / DAY_MS) + 1;
  return Math.min(Math.max(days, 1), MAX_PAST_DAYS);
}

// Only hours already over: the rest is forecast
export function completedHours(rows, now) {
  return rows.filter((row) => row.observedAt <= now);
}
