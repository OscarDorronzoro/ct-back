import {
  pgTable, integer, varchar, text, timestamp,
} from 'drizzle-orm/pg-core';

const cows = pgTable('cows', {
  id: integer().notNull().primaryKey().generatedAlwaysAsIdentity(),
  breedId: integer('breed_id'),
  currentCollarId: integer('current_collar_id'),
  earTag: varchar('ear_tag'),
  alias: varchar(),
  birthDate: timestamp('birth_date'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

export default cows;
