import { eq, asc } from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import products from './product.schema';

const productRepository = {
  // activeOnly: the ones that can be used in new events
  async findAll({ activeOnly = false } = {}, tx = db) {
    return tx
      .select()
      .from(products)
      .where(activeOnly ? eq(products.active, true) : undefined)
      .orderBy(asc(products.name));
  },

  async findById(id, tx = db) {
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, id));

    return product ?? null;
  },

  async findByName(name, tx = db) {
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.name, name));

    return product ?? null;
  },

  async create(values, tx = db) {
    const [product] = await tx
      .insert(products)
      .values(values)
      .returning();

    return product;
  },

  async update(id, values, tx = db) {
    const [product] = await tx
      .update(products)
      .set(values)
      .where(eq(products.id, id))
      .returning();

    return product ?? null;
  },
};

export default productRepository;
