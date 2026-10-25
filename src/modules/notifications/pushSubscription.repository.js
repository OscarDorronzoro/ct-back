import { and, eq, inArray } from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import pushSubscriptions from './pushSubscription.schema';
import userSessions from '../identity/session.schema';
import userRoles from '../identity/userRole.schema';
import { isActive } from '../identity/session.repository';

const pushSubscriptionRepository = {
  // A device turned them on (again): the endpoint is the device, now for this user and session
  async upsert(values, tx = db) {
    const [subscription] = await tx
      .insert(pushSubscriptions)
      .values(values)
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: values.userId,
          sessionId: values.sessionId,
          p256dh: values.p256dh,
          auth: values.auth,
          userAgent: values.userAgent,
        },
      })
      .returning();

    return subscription;
  },

  async findByEndpoint(endpoint, tx = db) {
    const [subscription] = await tx
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));

    return subscription ?? null;
  },

  // Only the user's own device
  async deleteByEndpoint(userId, endpoint, tx = db) {
    await tx
      .delete(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint),
      ));
  },

  // The push service says the device is gone
  async deleteByIds(ids, tx = db) {
    if (ids.length > 0) {
      await tx.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, ids));
    }
  },

  async markSent(ids, at, tx = db) {
    if (ids.length > 0) {
      await tx
        .update(pushSubscriptions)
        .set({ lastSentAt: at })
        .where(inArray(pushSubscriptions.id, ids));
    }
  },

  // Devices whose session is still open, with the roles of their user (who can receive what).
  // userId: only those of a user.
  async findActive({ userId } = {}, now = new Date(), tx = db) {
    const rows = await tx
      .select({ subscription: pushSubscriptions, role: userRoles.role })
      .from(pushSubscriptions)
      .innerJoin(userSessions, eq(userSessions.id, pushSubscriptions.sessionId))
      .leftJoin(userRoles, eq(userRoles.userId, pushSubscriptions.userId))
      .where(and(
        isActive(now, tx),
        userId ? eq(pushSubscriptions.userId, userId) : undefined,
      ));

    const byId = new Map();
    rows.forEach(({ subscription, role }) => {
      const entry = byId.get(subscription.id) ?? { ...subscription, roles: [] };
      if (role) {
        entry.roles.push(role);
      }
      byId.set(subscription.id, entry);
    });

    return [...byId.values()];
  },
};

export default pushSubscriptionRepository;
