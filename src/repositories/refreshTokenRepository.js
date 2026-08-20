import { eq, lt } from 'drizzle-orm';

import db from '../db/drizzle';
import refreshTokens from '../schema/refreshTokens';

const refreshTokenRepository = {
  async create(values, tx = db) {
    const [refreshToken] = await tx
      .insert(refreshTokens)
      .values(values)
      .returning();

    return refreshToken;
  },

  async findByTokenHash(tokenHash, tx = db) {
    const [refreshToken] = await tx
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));

    return refreshToken ?? null;
  },

  async revoke(id, revokedAt = new Date(), tx = db) {
    const [refreshToken] = await tx
      .update(refreshTokens)
      .set({
        revokedAt,
      })
      .where(eq(refreshTokens.id, id))
      .returning();

    return refreshToken ?? null;
  },

  async deleteExpired(tx = db) {
    const now = new Date();

    return tx
      .delete(refreshTokens)
      .where(
        lt(refreshTokens.expiresAt, now),
      );
  },
};

export default refreshTokenRepository;
