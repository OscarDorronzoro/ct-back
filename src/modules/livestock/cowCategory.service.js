import db from '../../shared/db/drizzle';
import cowRepository from './cow.repository';
import categoryRepository from './category.repository';
import cowCategoryAssignmentRepository from './cowCategoryAssignment.repository';
import animalEventRepository from '../health/animalEvent.repository';
import { expectedCategory } from './categoryRules.util';
import logger from '../../shared/utils/logger';

// Category of a cow over time: cows.category_id is the current one, cow_category_assignments
// keeps the history. Changes come from the cow form (manual), the age rules (automatic) or an
// event (castration).
const cowCategoryService = {
  // History after cows.category_id changed: closes the current assignment, opens the new one.
  // Returns whether there was a change.
  async recordChange(cowId, categoryId, {
    at = new Date(), source, eventId = null, userId = null,
  }, tx = db) {
    const current = await cowCategoryAssignmentRepository.findCurrent(cowId, tx);

    if ((current?.categoryId ?? null) === categoryId) {
      return false;
    }

    // An event recorded late (castrated last week) can't go back past the start of the current
    // category: the history would overlap. It counts from then.
    const from = current && current.dateFrom > at ? current.dateFrom : at;

    await cowCategoryAssignmentRepository.closeCurrent(cowId, from, tx);

    if (categoryId !== null) {
      await cowCategoryAssignmentRepository.create({
        cowId, categoryId, dateFrom: from, source, eventId, assignedBy: userId,
      }, tx);
    }

    return true;
  },

  // Applies the rules (age, castration) to a cow. Returns the new category, or null if unchanged.
  // at: when the change counts from (the date of the castration; now for the age rules).
  async applyRules(cowId, {
    now = new Date(), at = now, source = 'automatic', eventId = null, userId = null,
  } = {}, tx = db) {
    const cow = await cowRepository.findById(cowId, tx);

    if (!cow) {
      return null;
    }

    const current = cow.categoryId ? await categoryRepository.findById(cow.categoryId, tx) : null;
    const target = expectedCategory({
      sex: cow.sex,
      birthDate: cow.birthDate,
      castrated: await animalEventRepository.isCastrated(cowId, tx),
      current: current?.name ?? null,
    }, now);

    if (!target) {
      return null;
    }

    const category = await categoryRepository.findByName(target, tx);
    await cowRepository.update(cowId, { categoryId: category.id, updatedAt: new Date() }, tx);
    await this.recordChange(cowId, category.id, {
      at, source, eventId, userId,
    }, tx);

    return category;
  },

  // Daily job: age rules over every active cow, each one in its own transaction (one failing
  // doesn't stop the rest; the connection pool limits how many run at once)
  async applyRulesToAll(now = new Date()) {
    const ids = await cowRepository.findIdsWithSex();

    const results = await Promise.allSettled(ids.map((cowId) => db.transaction(
      (tx) => this.applyRules(cowId, { now }, tx),
    )));

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error({ message: 'Category rules failed for a cow', cowId: ids[index], error: result.reason });
      }
    });

    return {
      cows: ids.length,
      changed: results.filter((r) => r.status === 'fulfilled' && r.value).length,
      failed: results.filter((r) => r.status === 'rejected').length,
    };
  },

  async getHistory(cowId) {
    return cowCategoryAssignmentRepository.findByCow(cowId);
  },
};

export default cowCategoryService;
