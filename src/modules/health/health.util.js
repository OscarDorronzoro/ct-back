const DAY_MS = 24 * 3600 * 1000;

// End of the withdrawal of an application: the product can't be in the meat / milk until then.
// It counts from the last day of application (duration 1: the day of the event).
// Null: no withdrawal.
export function withdrawalUntil(occurredAt, withdrawalDays, durationDays = 1) {
  if (!withdrawalDays) {
    return null;
  }

  return new Date(occurredAt.getTime() + (durationDays - 1 + withdrawalDays) * DAY_MS);
}

const latest = (dates) => dates
  .filter(Boolean)
  .reduce((max, d) => (!max || d > max ? d : max), null);

// What the clinical history says today, from its events (voided ones don't count):
// - withdrawal: latest end of meat and milk withdrawal still running (null: can be sold);
// - lastWeight: latest weighing;
// - nextDoses: per vaccine, the booster asked by its latest vaccination (overdue if past).
export function healthSummary(events, now = new Date()) {
  const valid = events.filter((e) => !e.voided);
  const applications = valid.filter((e) => e.type === 'vaccination' || e.type === 'treatment');

  const running = (field) => {
    const until = latest(applications.map((e) => e.details[field]));
    return until && until > now ? until : null;
  };

  const lastWeighing = valid
    .filter((e) => e.type === 'weighing')
    .reduce((last, e) => (!last || e.occurredAt > last.occurredAt ? e : last), null);

  const latestVaccinationByProduct = new Map();
  valid.filter((e) => e.type === 'vaccination').forEach((e) => {
    const current = latestVaccinationByProduct.get(e.details.product.id);
    if (!current || e.occurredAt > current.occurredAt) {
      latestVaccinationByProduct.set(e.details.product.id, e);
    }
  });

  // Local date of the server (like startOfToday), not UTC
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  const nextDoses = [...latestVaccinationByProduct.values()]
    .filter((e) => e.details.nextDoseOn)
    .map((e) => ({
      product: e.details.product,
      dueOn: e.details.nextDoseOn,
      overdue: e.details.nextDoseOn < today,
      eventId: e.id,
    }))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));

  return {
    withdrawal: {
      meatUntil: running('meatWithdrawalUntil'),
      milkUntil: running('milkWithdrawalUntil'),
    },
    lastWeight: lastWeighing
      ? { kg: lastWeighing.details.weightKg, at: lastWeighing.occurredAt }
      : null,
    nextDoses,
  };
}
