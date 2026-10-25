import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import webpush from 'web-push';
import type { TestProject } from 'vitest/node';

// The version of production
const IMAGE = 'postgis/postgis:18-3.6';
const LABEL = 'cattle-integration-tests';
const NAME = `cattle-integration-${process.pid}`;
const DATABASE = 'cattle';
const ADMIN_PASSWORD = 'integration-admin';
const APP_PASSWORD = 'integration-app';

// A new database like the next deploy leaves production: its schema, the reference data of
// v1.0.0, then every section of deploy.sql
const SQL_FILES = ['schema.sql', 'reference-data.sql', 'deploy.sql'];
const SQL_DIR = path.resolve(import.meta.dirname, '../../db_restore');

const RUN_OPTIONS = [
  '-d',
  '--label', LABEL,
  '--name', NAME,
  '-e', `POSTGRES_PASSWORD=${ADMIN_PASSWORD}`,
  '-e', `POSTGRES_DB=${DATABASE}`,
  // The data in memory: nothing on the disk (no volume left behind), and faster
  '--tmpfs', '/var/lib/postgresql',
  // A free port of the host, only local
  '-p', '127.0.0.1::5432',
];

const docker = (...args: string[]) => execFileSync('docker', args, { encoding: 'utf8' }).trim();

// As superuser, stopping at the first error
const PSQL = ['psql', '-U', 'postgres', '-d', DATABASE, '-v', 'ON_ERROR_STOP=1', '-q'];
const psql = (...args: string[]) => docker('exec', NAME, ...PSQL, ...args);

// The image starts a temporary server to create the database, then the real one: ready after the
// second "ready to accept connections"
async function waitUntilReady(attempts = 120): Promise<void> {
  // PostgreSQL logs to stderr
  const { stdout, stderr } = spawnSync('docker', ['logs', NAME], { encoding: 'utf8' });
  const ready = (stdout + stderr).match(/database system is ready to accept connections/g) ?? [];

  if (ready.length >= 2) {
    return undefined;
  }
  if (attempts === 0) {
    throw new Error('The test database did not start');
  }

  await sleep(500);
  return waitUntilReady(attempts - 1);
}

function removeLeftovers() {
  const ids = docker('ps', '-aq', '--filter', `label=${LABEL}`);
  if (ids) {
    docker('rm', '-f', '-v', ...ids.split('\n'));
  }
}

export async function setup(project: TestProject) {
  removeLeftovers();

  docker('run', ...RUN_OPTIONS, IMAGE);
  await waitUntilReady();

  // The app connects as in production: ctapp, with only the grants of the scripts
  psql('-c', `CREATE ROLE ctapp LOGIN PASSWORD '${APP_PASSWORD}'`);
  SQL_FILES.forEach((file) => {
    docker('cp', path.join(SQL_DIR, file), `${NAME}:/tmp/${file}`);
    psql('-o', '/dev/null', '-f', `/tmp/${file}`);
  });

  const port = docker('port', NAME, '5432/tcp').split(':').pop() as string;
  const vapid = webpush.generateVAPIDKeys();

  project.provide('env', {
    DB_HOST: '127.0.0.1',
    DB_PORT: port,
    DB_NAME: DATABASE,
    DB_USERNAME: 'ctapp',
    DB_PASSWORD: APP_PASSWORD,
    // Superuser, only for the tests to empty the tables between them
    TEST_DB_ADMIN_URL: `postgres://postgres:${ADMIN_PASSWORD}@127.0.0.1:${port}/${DATABASE}`,
    JWT_SECRET: 'integration-test-secret',
    VAPID_PUBLIC_KEY: vapid.publicKey,
    VAPID_PRIVATE_KEY: vapid.privateKey,
    VAPID_SUBJECT: 'mailto:tests@example.com',
  });

  return () => docker('rm', '-f', '-v', NAME);
}

declare module 'vitest' {
  export interface ProvidedContext {
    env: Record<string, string>;
  }
}
