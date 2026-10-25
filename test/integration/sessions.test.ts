import {
  describe, it, expect, beforeEach, afterAll,
} from 'vitest';
import jwt from 'jsonwebtoken';

import { apiClient, type ApiClient } from './helpers/api';
import { resetDatabase, query, closeDatabase } from './helpers/database';
import { createUser, loggedIn, PASSWORD } from './helpers/fixtures';

beforeEach(resetDatabase);
afterAll(closeDatabase);

const sessionsOf = (userId: number) => query<{ id: string; revoked_reason: string | null }>(
  'SELECT id, revoked_reason FROM user_sessions WHERE user_id = $1 ORDER BY created_at',
  [userId],
);

describe('login', () => {
  it('opens a session: both cookies, and /me answers with the roles and permissions', async () => {
    await createUser('ana', ['veterinarian']);
    const client = apiClient();

    const res = await client.login('ana', PASSWORD);

    expect(res.status).toBe(200);
    expect([...client.cookies.keys()].sort()).toEqual(['auth_token', 'refresh_token']);

    const me = await client.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ username: 'ana', roles: ['veterinarian'] });
    expect(me.body.user.permissions).toContain('health:write');
    expect(me.body.user.permissions).not.toContain('users:manage');
  });

  it('rejects a wrong password or an unknown user the same way', async () => {
    await createUser('ana', ['viewer']);

    const wrong = await apiClient().login('ana', 'not-the-password');
    const unknown = await apiClient().login('nobody', PASSWORD);

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('asks for a session in the API, and refuses old tokens with a numeric role', async () => {
    expect((await apiClient().get('/api/cows')).status).toBe(401);

    const user = await createUser('ana', ['admin']);
    const oldToken = jwt.sign({ sub: user.id, role: 0 }, process.env.JWT_SECRET as string);
    const client = apiClient();
    client.cookies.set('auth_token', oldToken);

    expect((await client.get('/api/cows')).status).toBe(401);
  });
});

describe('refresh', () => {
  it('rotates the refresh token: a new one each time', async () => {
    const { client } = await loggedIn('ana', ['viewer']);
    const first = client.cookies.get('refresh_token');

    const res = await client.post('/api/auth/refresh');

    expect(res.status).toBe(200);
    expect(client.cookies.get('refresh_token')).not.toBe(first);
    expect((await client.get('/api/auth/me')).status).toBe(200);
  });

  it('lets two requests refresh with the same token at once (two tabs)', async () => {
    const { user, client } = await loggedIn('ana', ['viewer']);
    const token = client.cookies.get('refresh_token') as string;
    const tab = apiClient();
    tab.cookies.set('refresh_token', token);

    const results = await Promise.all([client.post('/api/auth/refresh'), tab.post('/api/auth/refresh')]);

    // One rotates, the other one learns it was already done: nobody is logged out
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(results.map((r) => r.body.message).sort()).toEqual(['Token already refreshed', 'Token refreshed']);
    expect((await sessionsOf(user.id))[0].revoked_reason).toBeNull();
  });

  it('ends the whole session when a rotated token comes back later (stolen copy)', async () => {
    const { user, client } = await loggedIn('ana', ['viewer']);
    const stolen = client.cookies.get('refresh_token') as string;
    await client.post('/api/auth/refresh');

    // Rotated a minute ago: past the grace for concurrent requests
    await query("UPDATE refresh_tokens SET rotated_at = now() - interval '1 minute' WHERE rotated_at IS NOT NULL");

    const thief = apiClient();
    thief.cookies.set('refresh_token', stolen);
    expect((await thief.post('/api/auth/refresh')).status).toBe(401);

    // The legitimate client loses the session too, and must log in again
    expect((await sessionsOf(user.id))[0].revoked_reason).toBe('reuse');
    expect((await client.post('/api/auth/refresh')).status).toBe(401);
  });

  it('refuses an expired refresh token', async () => {
    const { client } = await loggedIn('ana', ['viewer']);
    await query("UPDATE refresh_tokens SET expires_at = now() - interval '1 second'");

    expect((await client.post('/api/auth/refresh')).status).toBe(401);
  });
});

describe('logout', () => {
  it('revokes the session: the refresh token no longer works', async () => {
    const { user, client } = await loggedIn('ana', ['viewer']);
    const refreshToken = client.cookies.get('refresh_token') as string;

    expect((await client.post('/api/auth/logout')).status).toBe(204);
    expect(client.cookies.size).toBe(0);
    expect((await sessionsOf(user.id))[0].revoked_reason).toBe('logout');

    const again = apiClient();
    again.cookies.set('refresh_token', refreshToken);
    expect((await again.post('/api/auth/refresh')).status).toBe(401);
  });
});

describe('sessions of a user (admin)', () => {
  it('lists the devices and closes one: that device can no longer refresh', async () => {
    const { client: admin } = await loggedIn('admin', ['admin']);
    const { user: ana, client: phone } = await loggedIn('ana', ['viewer']);
    const laptop = apiClient();
    await laptop.login('ana', PASSWORD);

    const list = await admin.get(`/api/users/${ana.id}/sessions`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(2);

    const [phoneSession] = await sessionsOf(ana.id);
    expect((await admin.delete(`/api/users/${ana.id}/sessions/${phoneSession.id}`)).status).toBe(204);

    expect((await phone.post('/api/auth/refresh')).status).toBe(401);
    expect((await laptop.post('/api/auth/refresh')).status).toBe(200);
  });

  it('closes all the other sessions of the admin, keeping the current one', async () => {
    const { user, client } = await loggedIn('admin', ['admin']);
    const other = apiClient();
    await other.login('admin', PASSWORD);

    const res = await client.delete(`/api/users/${user.id}/sessions`);

    expect(res.status).toBe(200);
    expect(res.body.revoked).toBe(1);
    expect((await client.post('/api/auth/refresh')).status).toBe(200);
    expect((await other.post('/api/auth/refresh')).status).toBe(401);
  });

  it('is only for admins', async () => {
    const { user, client } = await loggedIn('ana', ['manager']);

    expect((await client.get(`/api/users/${user.id}/sessions`)).status).toBe(403);
  });
});

describe('permissions of each role', () => {
  const zone = {
    name: 'Potrero 1',
    zoneTypeId: 2,
    points: [[-32.97, -61.21], [-32.97, -61.2], [-32.96, -61.2]],
  };

  const ROLES = ['admin', 'manager', 'veterinarian', 'technician', 'viewer'];
  type Request = (client: ApiClient) => Promise<{ status: number }>;

  // [what, request, roles allowed]. Each role in ROLES tries it: allowed ones pass, the rest 403
  const cases: [string, Request, string[]][] = [
    ['read the cows', (c) => c.get('/api/cows'), ROLES],
    ['create a group', (c) => c.post('/api/groups', { name: `G ${Math.random()}` }), ['admin', 'manager', 'veterinarian']],
    ['create a collar', (c) => c.post('/api/collars', {}), ['admin', 'technician']],
    ['create a zone', (c) => c.post('/api/zones', zone), ['admin', 'manager']],
    ['list the users', (c) => c.get('/api/users'), ['admin']],
  ];

  it.each(cases)('%s', async (_, makeRequest, allowed) => {
    const clients = await Promise.all(ROLES.map((role) => loggedIn(`user-${role}`, [role])));

    const responses = await Promise.all(clients.map(({ client }) => makeRequest(client)));
    const statuses = responses.map((r) => r.status);

    ROLES.forEach((role, i) => {
      if (allowed.includes(role)) {
        expect(statuses[i], role).toBeLessThan(400);
      } else {
        expect(statuses[i], role).toBe(403);
      }
    });
  });

  it('joins the permissions of several roles', async () => {
    const { client } = await loggedIn('ana', ['veterinarian', 'technician']);

    expect((await client.post('/api/collars', {})).status).toBe(201);
    expect((await client.post('/api/groups', { name: 'Rodeo' })).status).toBe(201);
    expect((await client.get('/api/users')).status).toBe(403);
  });
});

describe('the last admin', () => {
  it("can't take the admin role away from themselves nor delete themselves", async () => {
    const { user, client } = await loggedIn('admin', ['admin']);

    const demote = await client.put(`/api/users/${user.id}`, { roles: ['viewer'] });
    const remove = await client.delete(`/api/users/${user.id}`);

    expect(demote.status).toBe(400);
    expect(demote.body.error).toBe('CANNOT_REMOVE_OWN_ADMIN_ROLE');
    expect(remove.status).toBe(400);
    expect(remove.body.error).toBe('CANNOT_DELETE_YOURSELF');
  });

  it('survives two admins removing each other at the same time: only one succeeds', async () => {
    const { user: ana, client: anaClient } = await loggedIn('ana', ['admin']);
    const { user: bea, client: beaClient } = await loggedIn('bea', ['admin']);

    const results = await Promise.all([
      anaClient.put(`/api/users/${bea.id}`, { roles: ['viewer'] }),
      beaClient.put(`/api/users/${ana.id}`, { roles: ['viewer'] }),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(results.find((r) => r.status === 409)?.body.error).toBe('LAST_ADMIN');

    const admins = await query("SELECT user_id FROM user_roles WHERE role = 'admin'");
    expect(admins).toHaveLength(1);
  });

  it('survives two admins deleting each other at the same time', async () => {
    const { user: ana, client: anaClient } = await loggedIn('ana', ['admin']);
    const { user: bea, client: beaClient } = await loggedIn('bea', ['admin']);

    const results = await Promise.all([
      anaClient.delete(`/api/users/${bea.id}`),
      beaClient.delete(`/api/users/${ana.id}`),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([204, 409]);
    expect(await query('SELECT id FROM users')).toHaveLength(1);
  });
});
