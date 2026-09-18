import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import logger from '../utils/logger';

const {
  DB_NAME,
  DB_USERNAME,
  DB_PASSWORD,
  DB_HOST,
} = process.env;

const pool = new Pool({
  connectionString: `postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}`,
});

pool.on('error', (err) => {
  logger.error({
    message: 'Caught unexpected PostgreSQL pool error on drizzle.js',
    error: err,
  });
});

const db = drizzle(pool);

export default db;
