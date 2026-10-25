import crypto from 'node:crypto';

import userService from '../../../src/modules/identity/user.service';
import { query } from './database';
import { apiClient, sha256 } from './api';

export const PASSWORD = 'integration-password';

// A user with these roles (through the service: hashed password, roles)
export async function createUser(username: string, roles: string[]) {
  const user = await userService.create({ username, password: PASSWORD, roles });
  return user as { id: number; username: string };
}

// A user logged in through the API: a client with its session cookies
export async function loggedIn(username: string, roles: string[]) {
  const user = await createUser(username, roles);
  const client = apiClient();
  const res = await client.login(username, PASSWORD);

  if (res.status !== 200) {
    throw new Error(`Login of ${username} failed: ${res.status}`);
  }

  return { user, client };
}

// A gateway and its API key (only the hash is stored, like in production)
export async function createGateway() {
  const apiKey = `gw_test_${crypto.randomUUID()}`;
  await query('INSERT INTO gateways (description, api_key_hash) VALUES ($1, $2)', ['tests', sha256(apiKey)]);
  return apiKey;
}
