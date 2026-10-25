import { EVENT_TYPES } from '../telemetry/rf.constants';
import { FARM_TIMEZONE } from '../analytics/analytics.constants';

// Events that notify (when they start; the return is seen on the map)
export const NOTIFIED_EVENTS = [EVENT_TYPES.FIELD_EXIT, EVENT_TYPES.EXCLUSION_ENTER];

// Older events (a gateway sending its queue late) are not news anymore: not notified
export const NOTIFY_MAX_AGE_MS = 30 * 60 * 1000;

// Notification of an event of eventNotificationRepository.findAfter: { title, body, url, tag }
export function eventMessage(event) {
  const time = new Date(event.occurredAt).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: FARM_TIMEZONE,
  });
  const cow = event.cowAlias || `Vaca ${event.cowId}`;
  const collar = event.collarCode ? ` (collar ${event.collarCode})` : '';

  // The map centered on the cow; the tag replaces an older notification of the same cow and type
  const common = { url: `/?cow=${event.cowId}`, tag: `cow-${event.cowId}-${event.eventTypeId}` };

  if (event.eventTypeId === EVENT_TYPES.EXCLUSION_ENTER) {
    return {
      ...common,
      title: 'Vaca en zona de exclusión',
      body: `${cow}${collar} entró a «${event.zoneName}» · ${time}`,
    };
  }

  return {
    ...common,
    title: 'Vaca fuera del campo',
    body: `${cow}${collar} salió del campo · ${time}`,
  };
}
