import { defineConfig } from "drizzle-kit";
import dotenv from 'dotenv';

// Config
dotenv.config({ quiet: true });

const {
  DB_NAME,
  DB_USERNAME,
  DB_PASSWORD,
  DB_HOST,
} = process.env;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/**/*.schema.js",
  out: "./drizzle",
  dbCredentials: {
    url: `postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}`,
  },
});
