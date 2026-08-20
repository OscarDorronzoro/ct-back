import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const {
  DB_NAME,
  DB_USERNAME,
  DB_PASSWORD,
  DB_HOST,
} = process.env;

const pool = new Pool({
  connectionString: `postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}`,
});

const db = drizzle(pool);

export default db;
