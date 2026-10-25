import { describe, it, expect } from 'vitest';

import {
  zoneEvents, zoneStateOf, INITIAL_ZONE_STATE,
} from './zoneEvents.util';
import { EVENT_TYPES } from './rf.constants';

const inField = { hasField: true, inField: true, exclusionZoneId: null };
const outside = { hasField: true, inField: false, exclusionZoneId: null };
const inLagoon = { hasField: true, inField: true, exclusionZoneId: 7 };
const noField = { hasField: false, inField: false, exclusionZoneId: null };

type Result = { events: { eventTypeId: number }[] };
const types = (result: Result) => result.events.map((e) => e.eventTypeId);

describe('zoneEvents', () => {
  it('records the exit from the field after two positions in a row outside', () => {
    const result = zoneEvents(INITIAL_ZONE_STATE, outside, outside);

    expect(result.events).toEqual([{ eventTypeId: EVENT_TYPES.FIELD_EXIT, zoneId: null }]);
    expect(result.state.outside).toBe(true);
  });

  it('ignores a single position outside (GPS noise near the fence)', () => {
    expect(zoneEvents(INITIAL_ZONE_STATE, outside, inField).events).toEqual([]);
  });

  it('records nothing new while the cow stays outside', () => {
    const state = { outside: true, exclusionZoneId: null };
    expect(zoneEvents(state, outside, outside).events).toEqual([]);
  });

  it('records the return after two positions in a row inside, not after one', () => {
    const state = { outside: true, exclusionZoneId: null };

    expect(zoneEvents(state, inField, outside).events).toEqual([]);
    expect(types(zoneEvents(state, inField, inField))).toEqual([EVENT_TYPES.FIELD_RETURN]);
  });

  it('has no "outside the field" without general zones', () => {
    expect(zoneEvents(INITIAL_ZONE_STATE, noField, noField).events).toEqual([]);
  });

  it('records entering and leaving an exclusion zone, with the zone', () => {
    const entered = zoneEvents(INITIAL_ZONE_STATE, inLagoon, inLagoon);
    expect(entered.events).toEqual([{ eventTypeId: EVENT_TYPES.EXCLUSION_ENTER, zoneId: 7 }]);

    const left = zoneEvents(entered.state, inField, inField);
    expect(left.events).toEqual([{ eventTypeId: EVENT_TYPES.EXCLUSION_EXIT, zoneId: 7 }]);
    expect(left.state.exclusionZoneId).toBeNull();
  });
});

describe('zoneStateOf', () => {
  it('reads the state from the last events of the cow', () => {
    expect(zoneStateOf(null, null)).toEqual(INITIAL_ZONE_STATE);
    expect(zoneStateOf(
      { eventTypeId: EVENT_TYPES.FIELD_EXIT, zoneId: null },
      { eventTypeId: EVENT_TYPES.EXCLUSION_ENTER, zoneId: 7 },
    )).toEqual({ outside: true, exclusionZoneId: 7 });
    expect(zoneStateOf(
      { eventTypeId: EVENT_TYPES.FIELD_RETURN, zoneId: null },
      { eventTypeId: EVENT_TYPES.EXCLUSION_EXIT, zoneId: 7 },
    )).toEqual(INITIAL_ZONE_STATE);
  });
});
