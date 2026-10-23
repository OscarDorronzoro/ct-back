import { eq, asc } from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import categories from './category.schema';

const categoryRepository = {
  async findAll(tx = db) {
    return tx
      .select()
      .from(categories)
      .orderBy(asc(categories.id));
  },

  async findByName(name, tx = db) {
    const [category] = await tx
      .select()
      .from(categories)
      .where(eq(categories.name, name));

    return category ?? null;
  },

  async findById(id, tx = db) {
    const [category] = await tx
      .select()
      .from(categories)
      .where(eq(categories.id, id));

    return category ?? null;
  },
};

export default categoryRepository;
