import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Config
dotenv.config({ quiet: true });

const {
  DB_NAME,
  DB_USERNAME2,
  DB_PASSWORD2,
  DB_HOST,
} = process.env;

const pool = new Pool({
  connectionString: `postgres://${DB_USERNAME2}:${DB_PASSWORD2}@${DB_HOST}:5432/${DB_NAME}`,
});

const db = drizzle(pool);

export default db;
