import {
  and, eq, isNull, desc,
} from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import cowCategoryAssignments from './cowCategoryAssignment.schema';
import categories from './category.schema';

const cowCategoryAssignmentRepository = {
  async findCurrent(cowId, tx = db) {
    const [assignment] = await tx
      .select()
      .from(cowCategoryAssignments)
      .where(and(
        eq(cowCategoryAssignments.cowId, cowId),
        isNull(cowCategoryAssignments.dateTo),
      ));

    return assignment ?? null;
  },

  // Most recent first, with the category name
  async findByCow(cowId, tx = db) {
    return tx
      .select({
        id: cowCategoryAssignments.id,
        category: { id: categories.id, name: categories.name },
        dateFrom: cowCategoryAssignments.dateFrom,
        dateTo: cowCategoryAssignments.dateTo,
        source: cowCategoryAssignments.source,
        eventId: cowCategoryAssignments.eventId,
      })
      .from(cowCategoryAssignments)
      .innerJoin(categories, eq(categories.id, cowCategoryAssignments.categoryId))
      .where(eq(cowCategoryAssignments.cowId, cowId))
      .orderBy(desc(cowCategoryAssignments.dateFrom), desc(cowCategoryAssignments.id));
  },

  async closeCurrent(cowId, at, tx = db) {
    await tx
      .update(cowCategoryAssignments)
      .set({ dateTo: at })
      .where(and(
        eq(cowCategoryAssignments.cowId, cowId),
        isNull(cowCategoryAssignments.dateTo),
      ));
  },

  async create(assignment, tx = db) {
    const [created] = await tx
      .insert(cowCategoryAssignments)
      .values(assignment)
      .returning();

    return created;
  },
};

export default cowCategoryAssignmentRepository;
