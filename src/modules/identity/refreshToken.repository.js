import {
  and, eq, lt, isNull,
} from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import refreshTokens from './refreshToken.schema';
import userSessions from './session.schema';

const refreshTokenRepository = {
  async create(values, tx = db) {
    const [refreshToken] = await tx
      .insert(refreshTokens)
      .values(values)
      .returning();

    return refreshToken;
  },

  // Token with its session ({ token, session })
  async findByTokenHash(tokenHash, tx = db) {
    const [row] = await tx
      .select({ token: refreshTokens, session: userSessions })
      .from(refreshTokens)
      .innerJoin(userSessions, eq(userSessions.id, refreshTokens.sessionId))
      .where(eq(refreshTokens.tokenHash, tokenHash));

    return row ?? null;
  },

  // Only one caller wins: concurrent refreshes with the same token get null
  async markRotated(id, rotatedAt, tx = db) {
    const [refreshToken] = await tx
      .update(refreshTokens)
      .set({ rotatedAt })
      .where(and(
        eq(refreshTokens.id, id),
        isNull(refreshTokens.rotatedAt),
      ))
      .returning();

    return refreshToken ?? null;
  },

  // Expired tokens, rotated or not (rotated ones are kept until then to detect reuse)
  async deleteExpired(now = new Date(), tx = db) {
    const deleted = await tx
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, now))
      .returning({ id: refreshTokens.id });

    return deleted.length;
  },
};

export default refreshTokenRepository;
