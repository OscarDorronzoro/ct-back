import { inject } from 'vitest';

// Before the test files import the app: its database, keys and secrets (globalSetup)
Object.assign(process.env, inject('env'));
