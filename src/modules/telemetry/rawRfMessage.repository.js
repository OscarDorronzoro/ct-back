import {
  and, or,
  eq, inArray, gte, lt, lte, isNull, isNotNull,
  asc, desc,
  sql,
} from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import rawRfMessages from './rawRfMessage.schema';
import buildConditions from '../../shared/utils/buildConditions';
import collars from '../devices/collar.schema';
import cowCollarAssignments from '../livestock/cowCollarAssignment.schema';

const rawRfMessageRepository = {

  async findPendingForProcessing(limit = 1000, tx = db) {
    const query = tx
      .select({
        ...rawRfMessages,
        collarId: collars.id,
        cowId: cowCollarAssignments.cowId,
      })
      .from(rawRfMessages)
      .leftJoin(
        collars,
        and(
          eq(rawRfMessages.collarCode, collars.code),
          isNull(collars.deletedAt),
        ),
      )
      .leftJoin(
        cowCollarAssignments,
        and(
          eq(collars.id, cowCollarAssignments.collarId),
          gte(rawRfMessages.recordedAt, cowCollarAssignments.dateFrom),
          or(
            isNull(cowCollarAssignments.dateTo),
            lt(rawRfMessages.recordedAt, cowCollarAssignments.dateTo),
          ),
        ),
      )
      .where(isNull(rawRfMessages.processedAt))
      .orderBy(asc(rawRfMessages.id))
      .limit(limit);

    const rawRfMessageList = await query;
    return rawRfMessageList;
  },

  async findAll(options = {}, tx = db) {
    const conditions = buildConditions(rawRfMessages, options.where);

    let query = tx.select().from(rawRfMessages);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.orderBy) {
      query = query.orderBy(
        ...options.orderBy.map((o) => (o.direction.toLowerCase() === 'desc'
          ? desc(rawRfMessages[o.field])
          : asc(rawRfMessages[o.field]))),
      );
    }

    const rawRfMessageList = await query;
    return rawRfMessageList;
  },

  async findById(id, tx = db) {
    const [result] = await tx
      .select()
      .from(rawRfMessages)
      .where(eq(rawRfMessages.id, id));

    return result ?? null;
  },

  // Last battery reading of a collar up to `before` (messages without voltage are skipped)
  async findLastVoltage(collarCode, before, tx = db) {
    const [result] = await tx
      .select({
        voltage: rawRfMessages.voltage,
        recordedAt: rawRfMessages.recordedAt,
      })
      .from(rawRfMessages)
      .where(and(
        eq(rawRfMessages.collarCode, collarCode),
        isNotNull(rawRfMessages.voltage),
        lte(rawRfMessages.recordedAt, before),
      ))
      .orderBy(desc(rawRfMessages.recordedAt))
      .limit(1);

    return result ?? null;
  },

  async create(rawRfMessage, tx = db) {
    const [created] = await tx
      .insert(rawRfMessages)
      .values(rawRfMessage)
      .returning();

    return created;
  },

  async update(rawRfMessage, tx = db) {
    const { id, ...changes } = rawRfMessage;

    await tx.update(rawRfMessages)
      .set(changes)
      .where(eq(rawRfMessages.id, id));
  },

  async updateBatch(rows, tx = db) {
    if (rows.length === 0) return;

    const { processedAt } = rows[0];

    const invalidReasonCase = sql`
      (CASE
        ${sql.join(
    rows.map((r) => sql`WHEN ${rawRfMessages.id} = ${r.id} THEN ${r.invalidReasonId}`),
    sql.raw(' '),
  )}
      END)::integer
    `;

    await tx
      .update(rawRfMessages)
      .set({
        invalidReasonId: invalidReasonCase,
        processedAt,
      })
      .where(
        inArray(
          rawRfMessages.id,
          rows.map((r) => r.id),
        ),
      );
  },

};

export default rawRfMessageRepository;
