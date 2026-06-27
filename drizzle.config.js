import { defineConfig } from "drizzle-kit";
import dotenv from 'dotenv';

// Config
dotenv.config({ quiet: true });

const {
  DB_NAME,
  DB_USERNAME2,
  DB_PASSWORD2,
  DB_HOST,
} = process.env;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/*",
  out: "./drizzle",
  dbCredentials: {
    url: `postgres://${DB_USERNAME2}:${DB_PASSWORD2}@${DB_HOST}:5432/${DB_NAME}`,
  },
});
