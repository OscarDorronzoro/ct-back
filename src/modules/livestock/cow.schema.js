import {
  pgTable, integer, varchar, text, timestamp,
} from 'drizzle-orm/pg-core';

const cows = pgTable('cows', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  breedId: integer('breed_id'),
  // 'male' | 'female'. Required to set a category, which must be of the same sex
  sex: varchar(),
  categoryId: integer('category_id'),
  currentCollarId: integer('current_collar_id'),
  earTag: varchar('ear_tag'),
  alias: varchar(),
  birthDate: timestamp('birth_date'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});

export default cows;
