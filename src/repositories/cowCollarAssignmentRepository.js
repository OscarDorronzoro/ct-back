import {
  eq,
  and,
  gt,
  gte,
  lt,
  lte,
  isNull,
  or,
} from 'drizzle-orm';

import db from '../db/drizzle';
import cowCollarAssignments from '../schema/cowCollarAssignments';

const cowCollarAssignmentRepository = {

  async findById(id, tx = db) {
    const [assignment] = await tx
      .select()
      .from(cowCollarAssignments)
      .where(eq(cowCollarAssignments.id, id));

    return assignment ?? null;
  },

  async findByCowIdAtDate(cowId, date = new Date(), tx = db) {
    const [assignment] = await tx
      .select()
      .from(cowCollarAssignments)
      .where(
        and(
          eq(cowCollarAssignments.cowId, cowId),
          lte(cowCollarAssignments.dateFrom, date),
          or(
            isNull(cowCollarAssignments.dateTo),
            gt(cowCollarAssignments.dateTo, date),
          ),
        ),
      );

    return assignment ?? null;
  },

  async findByCollarIdAtDate(collarId, date = new Date(), tx = db) {
    const [assignment] = await tx
      .select()
      .from(cowCollarAssignments)
      .where(
        and(
          eq(cowCollarAssignments.collarId, collarId),
          gte(date, cowCollarAssignments.dateFrom),
          or(
            isNull(cowCollarAssignments.dateTo),
            lt(date, cowCollarAssignments.dateTo),
          ),
        ),
      );

    return assignment ?? null;
  },

  async create(assignment, tx = db) {
    const [created] = await tx
      .insert(cowCollarAssignments)
      .values(assignment)
      .returning();

    return created;
  },

  async close(id, dateTo, tx = db) {
    const [closed] = await tx
      .update(cowCollarAssignments)
      .set({ dateTo })
      .where(eq(cowCollarAssignments.id, id))
      .returning();

    return closed ?? null;
  },

};

export default cowCollarAssignmentRepository;
