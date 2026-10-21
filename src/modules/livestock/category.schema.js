import { pgTable, integer, varchar } from 'drizzle-orm/pg-core';

// Cattle category (ternero, vaquillona, novillo...): the stage of the animal for its management.
// Each one is for a single sex; cows reference (id, sex), so a cow can't be in a category of the
// other sex (composite foreign key in the database).
const categories = pgTable('categories', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar().notNull().unique(),
  // 'male' | 'female'
  sex: varchar().notNull(),
});

export default categories;
