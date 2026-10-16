import {
  and, eq, desc, inArray, lte,
} from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import events from './event.schema';

const eventRepository = {

  async create(event, tx = db) {
    const [created] = await tx
      .insert(events)
      .values(event)
      .returning();

    return created;
  },

  async createMany(eventList, tx = db) {
    if (eventList.length === 0) {
      return [];
    }

    return tx
      .insert(events)
      .values(eventList)
      .returning();
  },

  // Last event of a collar among the given types, up to `before`
  async findLastBefore(collarId, eventTypeIds, before, tx = db) {
    const [result] = await tx
      .select()
      .from(events)
      .where(and(
        eq(events.collarId, collarId),
        inArray(events.eventTypeId, eventTypeIds),
        lte(events.occurredAt, before),
      ))
      .orderBy(desc(events.occurredAt), desc(events.id))
      .limit(1);

    return result ?? null;
  },

  // Last event of each collar among the given types
  async findLastByCollars(collarIds, eventTypeIds, tx = db) {
    if (collarIds.length === 0) {
      return [];
    }

    return tx
      .selectDistinctOn([events.collarId], {
        collarId: events.collarId,
        eventTypeId: events.eventTypeId,
        occurredAt: events.occurredAt,
      })
      .from(events)
      .where(and(
        inArray(events.collarId, collarIds),
        inArray(events.eventTypeId, eventTypeIds),
      ))
      .orderBy(events.collarId, desc(events.occurredAt), desc(events.id));
  },

};

export default eventRepository;
