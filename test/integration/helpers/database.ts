import pg from 'pg';

// As superuser (the app's user can't truncate): only to start each test from empty tables
const admin = new pg.Pool({ connectionString: process.env.TEST_DB_ADMIN_URL, max: 2 });

// Reference data (reference-data.sql, deploy.sql): kept between tests
const KEEP = ['event_types', 'zone_types', 'invalid_reasons', 'categories', 'products',
  'spatial_ref_sys', 'notification_cursor'];

export async function resetDatabase() {
  const { rows } = await admin.query(
    `SELECT format('%I.%I', schemaname, tablename) AS name
     FROM pg_tables
     WHERE schemaname IN ('public', 'dw') AND tablename <> ALL($1)`,
    [KEEP],
  );

  await admin.query(`TRUNCATE ${rows.map((r) => r.name).join(', ')} RESTART IDENTITY CASCADE`);
  await admin.query('UPDATE notification_cursor SET last_event_id = 0');
}

// Reads (and the few writes the API has no way to do, like aging a token) straight in the database
export async function query<T extends pg.QueryResultRow = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
) {
  const { rows } = await admin.query<T>(text, params);
  return rows;
}

export function closeDatabase() {
  return admin.end();
}
