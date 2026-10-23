import {
  eq, desc, sql, getTableColumns,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import db from '../../shared/db/drizzle';
import animalEvents from './animalEvent.schema';
import products from './product.schema';
import users from '../identity/user.schema';
import {
  vaccinations, treatments, examinations, weighings,
} from './healthDetails.schema';
import { EVENT_TYPES } from './health.constants';

const DETAIL_TABLES = {
  [EVENT_TYPES.VACCINATION]: vaccinations,
  [EVENT_TYPES.TREATMENT]: treatments,
  [EVENT_TYPES.EXAMINATION]: examinations,
  [EVENT_TYPES.WEIGHING]: weighings,
};

const recorder = alias(users, 'recorder');
const voider = alias(users, 'voider');

const withoutEventId = (table) => {
  const { eventId, ...columns } = getTableColumns(table);
  return columns;
};

// Each event with its user names, its product and the columns of every detail table
// (only the one of its type has values)
function baseQuery(tx) {
  return tx
    .select({
      event: animalEvents,
      recorderName: recorder.username,
      voiderName: voider.username,
      product: { id: products.id, name: products.name, type: products.type },
      vaccination: withoutEventId(vaccinations),
      treatment: withoutEventId(treatments),
      examination: withoutEventId(examinations),
      weighing: withoutEventId(weighings),
    })
    .from(animalEvents)
    .leftJoin(recorder, eq(recorder.id, animalEvents.recordedBy))
    .leftJoin(voider, eq(voider.id, animalEvents.voidedBy))
    .leftJoin(vaccinations, eq(vaccinations.eventId, animalEvents.id))
    .leftJoin(treatments, eq(treatments.eventId, animalEvents.id))
    .leftJoin(examinations, eq(examinations.eventId, animalEvents.id))
    .leftJoin(weighings, eq(weighings.eventId, animalEvents.id))
    .leftJoin(products, eq(products.id, sql`coalesce(${vaccinations.productId}, ${treatments.productId})`));
}

// Row -> event of the clinical history
function toEvent(row) {
  const { event } = row;
  const details = { ...row[event.type] };

  if (row.product?.id) {
    delete details.productId;
    details.product = row.product;
  }

  return {
    id: event.id,
    cowId: event.cowId,
    type: event.type,
    occurredAt: event.occurredAt,
    notes: event.notes,
    recordedBy: event.recordedBy ? { id: event.recordedBy, username: row.recorderName } : null,
    createdAt: event.createdAt,
    voided: event.voidedAt
      ? {
        at: event.voidedAt,
        by: event.voidedBy ? { id: event.voidedBy, username: row.voiderName } : null,
        reason: event.voidReason,
      }
      : null,
    details,
  };
}

const animalEventRepository = {
  // Clinical history of a cow, most recent first (voided events included)
  async findByCow(cowId, tx = db) {
    const rows = await baseQuery(tx)
      .where(eq(animalEvents.cowId, cowId))
      .orderBy(desc(animalEvents.occurredAt), desc(animalEvents.id));

    return rows.map(toEvent);
  },

  async findById(id, tx = db) {
    const [row] = await baseQuery(tx).where(eq(animalEvents.id, id));

    return row ? toEvent(row) : null;
  },

  // Base row only, locked: to void it without a concurrent void
  async lockById(id, tx) {
    const [event] = await tx
      .select()
      .from(animalEvents)
      .where(eq(animalEvents.id, id))
      .for('update');

    return event ?? null;
  },

  // Base row and its detail
  async create(event, details, tx = db) {
    const [created] = await tx
      .insert(animalEvents)
      .values({ ...event, createdAt: new Date() })
      .returning({ id: animalEvents.id });

    await tx
      .insert(DETAIL_TABLES[event.type])
      .values({ ...details, eventId: created.id });

    return created.id;
  },

  async void(id, { voidedBy, reason }, tx = db) {
    await tx
      .update(animalEvents)
      .set({ voidedAt: new Date(), voidedBy, voidReason: reason })
      .where(eq(animalEvents.id, id));
  },
};

export default animalEventRepository;
