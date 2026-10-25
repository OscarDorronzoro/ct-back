import { describe, it, expect } from 'vitest';

import { eventMessage } from './eventMessage.util';
import { EVENT_TYPES } from '../telemetry/rf.constants';

const event = {
  id: 1,
  cowId: 8,
  cowAlias: 'Ángela',
  collarCode: 129,
  zoneName: null as string | null,
  occurredAt: new Date('2026-10-24T17:05:00Z'),
};

describe('eventMessage', () => {
  it('tells which cow left the field and when, in the time of the farm', () => {
    expect(eventMessage({ ...event, eventTypeId: EVENT_TYPES.FIELD_EXIT })).toEqual({
      title: 'Vaca fuera del campo',
      body: 'Ángela (collar 129) salió del campo · 14:05',
      url: '/?cow=8',
      tag: `cow-8-${EVENT_TYPES.FIELD_EXIT}`,
    });
  });

  it('names the exclusion zone entered', () => {
    const message = eventMessage({ ...event, eventTypeId: EVENT_TYPES.EXCLUSION_ENTER, zoneName: 'Laguna' });

    expect(message.title).toBe('Vaca en zona de exclusión');
    expect(message.body).toBe('Ángela (collar 129) entró a «Laguna» · 14:05');
  });

  it('names a cow without alias by its id', () => {
    const message = eventMessage({
      ...event, cowAlias: null, collarCode: null, eventTypeId: EVENT_TYPES.FIELD_EXIT,
    });

    expect(message.body).toBe('Vaca 8 salió del campo · 14:05');
  });
});
