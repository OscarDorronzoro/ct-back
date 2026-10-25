import { EVENT_TYPES } from './rf.constants';

// Zone events of a cow: it left the field (every general zone) or came back, it entered an
// exclusion zone or left it. GPS has noise near a fence: a change needs two positions in a row on
// the other side, so a single bad fix neither starts nor ends anything.

export const FIELD_EVENTS = [EVENT_TYPES.FIELD_EXIT, EVENT_TYPES.FIELD_RETURN];
export const EXCLUSION_EVENTS = [EVENT_TYPES.EXCLUSION_ENTER, EVENT_TYPES.EXCLUSION_EXIT];

// Zone state of a cow: { outside, exclusionZoneId }. Without events: in the field, in no exclusion
export const INITIAL_ZONE_STATE = Object.freeze({ outside: false, exclusionZoneId: null });

// The state from the last field event and the last exclusion event of the cow
export function zoneStateOf(lastFieldEvent, lastExclusionEvent) {
  return {
    outside: lastFieldEvent?.eventTypeId === EVENT_TYPES.FIELD_EXIT,
    exclusionZoneId: lastExclusionEvent?.eventTypeId === EVENT_TYPES.EXCLUSION_ENTER
      ? lastExclusionEvent.zoneId
      : null,
  };
}

// Without general zones there's no field to be out of
const outsideField = (status) => status.hasField && !status.inField;

// Events after a position. current, previous: zoneRepository.findStatus of the position and of the
// one before it (same cow). Returns the events ({ eventTypeId, zoneId }) and the new state.
export function zoneEvents(state, current, previous) {
  const events = [];
  const next = { ...state };

  if (!state.outside && outsideField(current) && outsideField(previous)) {
    events.push({ eventTypeId: EVENT_TYPES.FIELD_EXIT, zoneId: null });
    next.outside = true;
  } else if (state.outside && current.inField && previous.inField) {
    events.push({ eventTypeId: EVENT_TYPES.FIELD_RETURN, zoneId: null });
    next.outside = false;
  }

  const inExclusion = current.exclusionZoneId !== null && previous.exclusionZoneId !== null;
  const outOfExclusion = current.exclusionZoneId === null && previous.exclusionZoneId === null;

  if (state.exclusionZoneId === null && inExclusion) {
    events.push({ eventTypeId: EVENT_TYPES.EXCLUSION_ENTER, zoneId: current.exclusionZoneId });
    next.exclusionZoneId = current.exclusionZoneId;
  } else if (state.exclusionZoneId !== null && outOfExclusion) {
    events.push({ eventTypeId: EVENT_TYPES.EXCLUSION_EXIT, zoneId: state.exclusionZoneId });
    next.exclusionZoneId = null;
  }

  return { events, state: next };
}
