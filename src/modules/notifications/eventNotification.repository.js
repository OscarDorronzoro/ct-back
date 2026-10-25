import {
  and, eq, gt, inArray, asc,
} from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import notificationCursor from './notificationCursor.schema';
import events from '../telemetry/event.schema';
import cows from '../livestock/cow.schema';
import collars from '../devices/collar.schema';
import zones from '../monitoring/zone.schema';

const eventNotificationRepository = {
  async getCursor(tx = db) {
    const [cursor] = await tx.select().from(notificationCursor);
    return cursor?.lastEventId ?? 0;
  },

  async setCursor(lastEventId, tx = db) {
    await tx
      .insert(notificationCursor)
      .values({ id: true, lastEventId })
      .onConflictDoUpdate({ target: notificationCursor.id, set: { lastEventId } });
  },

  // Events of the given types after the cursor, oldest first, with what the message names
  async findAfter(lastEventId, eventTypeIds, limit, tx = db) {
    return tx
      .select({
        id: events.id,
        eventTypeId: events.eventTypeId,
        cowId: events.cowId,
        occurredAt: events.occurredAt,
        cowAlias: cows.alias,
        collarCode: collars.code,
        zoneName: zones.name,
      })
      .from(events)
      .leftJoin(cows, eq(cows.id, events.cowId))
      .leftJoin(collars, eq(collars.id, events.collarId))
      .leftJoin(zones, eq(zones.id, events.zoneId))
      .where(and(
        gt(events.id, lastEventId),
        inArray(events.eventTypeId, eventTypeIds),
      ))
      .orderBy(asc(events.id))
      .limit(limit);
  },
};

export default eventNotificationRepository;
