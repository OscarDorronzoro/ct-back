import {
  eq, ne, and, or, lt, inArray,
  isNull, isNotNull,
  asc, desc, sql,
  getTableColumns,
} from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import commands from './command.schema';
import commandTargets from './commandTarget.schema';
import collars from './collar.schema';

const targetWithCommand = {
  ...getTableColumns(commandTargets),
  type: commands.type,
  payload: commands.payload,
};

const commandRepository = {

  async create(command, tx = db) {
    const [created] = await tx
      .insert(commands)
      .values(command)
      .returning();

    return created;
  },

  async createTargets(targets, tx = db) {
    if (targets.length === 0) {
      return [];
    }

    return tx
      .insert(commandTargets)
      .values(targets)
      .returning();
  },

  async findById(id, tx = db) {
    const [result] = await tx
      .select()
      .from(commands)
      .where(eq(commands.id, id));

    return result ?? null;
  },

  // Commands with a summary of their targets. Filtered by collar, the summary is for that collar.
  async findAll(options = {}, tx = db) {
    const conditions = [];

    if (options.collarId) {
      conditions.push(eq(commandTargets.collarId, options.collarId));
    }

    let query = tx
      .select({
        ...getTableColumns(commands),
        targets: sql`count(${commandTargets.id})::int`,
        pending: sql`count(*) filter (where ${commandTargets.status} = 'pending')::int`,
        delivered: sql`count(*) filter (where ${commandTargets.status} = 'delivered')::int`,
        succeeded: sql`count(*) filter (where ${commandTargets.result} in ('ok', 'duplicate'))::int`,
        failed: sql`count(*) filter (where ${commandTargets.result} in ('badParams', 'unsupported', 'noAnswer'))::int`,
        canceled: sql`count(*) filter (where ${commandTargets.result} = 'canceled')::int`,
      })
      .from(commands)
      .leftJoin(commandTargets, eq(commandTargets.commandId, commands.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query
      .groupBy(commands.id)
      .orderBy(desc(commands.id))
      .limit(options.limit ?? 100);
  },

  async findTargetsByCommand(commandId, tx = db) {
    return tx
      .select({
        ...getTableColumns(commandTargets),
        collarCode: collars.code,
      })
      .from(commandTargets)
      .innerJoin(collars, eq(collars.id, commandTargets.collarId))
      .where(eq(commandTargets.commandId, commandId))
      .orderBy(asc(commandTargets.id));
  },

  async findTargetsByIds(ids, tx = db) {
    if (ids.length === 0) {
      return [];
    }

    return tx
      .select(targetWithCommand)
      .from(commandTargets)
      .innerJoin(commands, eq(commands.id, commandTargets.commandId))
      .where(inArray(commandTargets.id, ids));
  },

  // Targets of a collar to hand to a gateway: never delivered, or delivered before
  // `redeliverBefore` without a result (the gateway may have lost its queue).
  // Locked so two gateways hearing the same collar don't take the same targets.
  async findDeliverable(collarId, options, tx = db) {
    const { redeliverBefore, limit, type } = options;

    return tx
      .select(targetWithCommand)
      .from(commandTargets)
      .innerJoin(commands, eq(commands.id, commandTargets.commandId))
      .where(and(
        eq(commandTargets.collarId, collarId),
        isNull(commands.canceledAt),
        type ? eq(commands.type, type) : undefined,
        or(
          eq(commandTargets.status, 'pending'),
          and(
            eq(commandTargets.status, 'delivered'),
            lt(commandTargets.deliveredAt, redeliverBefore),
          ),
        ),
      ))
      .orderBy(asc(commandTargets.id))
      .limit(limit)
      .for('update', { of: commandTargets, skipLocked: true });
  },

  async markDelivered(ids, gatewayId, tx = db) {
    if (ids.length === 0) {
      return;
    }

    await tx
      .update(commandTargets)
      .set({
        status: 'delivered',
        gatewayId,
        deliveredAt: new Date(),
        deliveries: sql`${commandTargets.deliveries} + 1`,
      })
      .where(inArray(commandTargets.id, ids));
  },

  // Targets of canceled commands that this gateway has queued and hasn't reported yet
  async findToCancel(gatewayId, tx = db) {
    const rows = await tx
      .select({ id: commandTargets.id })
      .from(commandTargets)
      .innerJoin(commands, eq(commands.id, commandTargets.commandId))
      .where(and(
        eq(commandTargets.status, 'delivered'),
        eq(commandTargets.gatewayId, gatewayId),
        isNotNull(commands.canceledAt),
      ))
      .orderBy(asc(commandTargets.id));

    return rows.map((row) => row.id);
  },

  // Open target of a collar for a command type (to avoid duplicating system commands)
  // Most recent unfinished, not canceled target of a collar for a command type
  async findOpenTarget(collarId, type, tx = db) {
    const [result] = await tx
      .select(targetWithCommand)
      .from(commandTargets)
      .innerJoin(commands, eq(commands.id, commandTargets.commandId))
      .where(and(
        eq(commandTargets.collarId, collarId),
        eq(commands.type, type),
        isNull(commands.canceledAt),
        ne(commandTargets.status, 'done'),
      ))
      .orderBy(desc(commandTargets.id))
      .limit(1);

    return result ?? null;
  },

  // Targets finished with the same result. Those already done are left as they are.
  // Returns the ones completed now.
  async completeTargets(ids, result, tx = db) {
    if (ids.length === 0) {
      return [];
    }

    return tx
      .update(commandTargets)
      .set({
        status: 'done',
        result,
        completedAt: new Date(),
      })
      .where(and(
        inArray(commandTargets.id, ids),
        ne(commandTargets.status, 'done'),
      ))
      .returning();
  },

  // Targets not handed to a gateway yet are canceled here. Delivered ones are canceled
  // when the gateway reports them.
  async cancel(id, tx = db) {
    const now = new Date();

    const [canceled] = await tx
      .update(commands)
      .set({ canceledAt: now })
      .where(and(
        eq(commands.id, id),
        isNull(commands.canceledAt),
      ))
      .returning();

    if (!canceled) {
      return null;
    }

    await tx
      .update(commandTargets)
      .set({
        status: 'done',
        result: 'canceled',
        completedAt: now,
      })
      .where(and(
        eq(commandTargets.commandId, id),
        eq(commandTargets.status, 'pending'),
      ));

    return canceled;
  },

};

export default commandRepository;
