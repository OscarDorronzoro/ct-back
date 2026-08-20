import { sql } from 'drizzle-orm';

export default function unaccentIlike(column, pattern) {
  return sql`unaccent(${column}) ILIKE unaccent(${pattern})`;
}
