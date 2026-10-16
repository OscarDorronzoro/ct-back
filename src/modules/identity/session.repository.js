import {
  and, eq, ne, gt, isNull, desc, exists, notExists,
} from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import userSessions from './session.schema';
import refreshTokens from './refreshToken.schema';

// Not revoked and its current token still valid
function isActive(now, tx) {
  return and(
    isNull(userSessions.revokedAt),
    exists(
      tx.select({ id: refreshTokens.id })
        .from(refreshTokens)
        .where(and(
          eq(refreshTokens.sessionId, userSessions.id),
          isNull(refreshTokens.rotatedAt),
          gt(refreshTokens.expiresAt, now),
        )),
    ),
  );
}

const userSessionRepository = {
  async create(values, tx = db) {
    const [session] = await tx
      .insert(userSessions)
      .values(values)
      .returning();

    return session;
  },

  async findById(id, tx = db) {
    const [session] = await tx
      .select()
      .from(userSessions)
      .where(eq(userSessions.id, id));

    return session ?? null;
  },

  async findActiveByUser(userId, now = new Date(), tx = db) {
    return tx
      .select()
      .from(userSessions)
      .where(and(
        eq(userSessions.userId, userId),
        isActive(now, tx),
      ))
      .orderBy(desc(userSessions.lastUsedAt));
  },

  async touch(id, { ip, userAgent }, tx = db) {
    await tx
      .update(userSessions)
      .set({ lastUsedAt: new Date(), lastIp: ip, userAgent })
      .where(eq(userSessions.id, id));
  },

  async revoke(id, reason, tx = db) {
    const [session] = await tx
      .update(userSessions)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where(and(
        eq(userSessions.id, id),
        isNull(userSessions.revokedAt),
      ))
      .returning();

    return session ?? null;
  },

  // All the user's sessions, optionally keeping one (the caller's own)
  async revokeAllForUser(userId, reason, { exceptId = null } = {}, tx = db) {
    const conditions = [
      eq(userSessions.userId, userId),
      isNull(userSessions.revokedAt),
    ];

    if (exceptId) {
      conditions.push(ne(userSessions.id, exceptId));
    }

    const revoked = await tx
      .update(userSessions)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where(and(...conditions))
      .returning({ id: userSessions.id });

    return revoked.length;
  },

  // Sessions left without tokens (all expired and deleted): nothing can use them anymore
  async deleteWithoutTokens(tx = db) {
    const deleted = await tx
      .delete(userSessions)
      .where(notExists(
        tx.select({ id: refreshTokens.id })
          .from(refreshTokens)
          .where(eq(refreshTokens.sessionId, userSessions.id)),
      ))
      .returning({ id: userSessions.id });

    return deleted.length;
  },
};

export default userSessionRepository;
