import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import userRepository from './user.repository';
import refreshTokenRepository from './refreshToken.repository';
import userSessionRepository from './session.repository';
import db from '../../shared/db/drizzle';
import logger from '../../shared/utils/logger';

import AppError from '../../shared/errors/AppError';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 30;
// A rotated token presented within this window is a concurrent refresh (two tabs), not a copy
const ROTATION_GRACE_MS = 30 * 1000;
const DUMMY_HASH = '$2b$12$dbDSd3dRnzOmUDPyya3OROLI8Uw73tKVG8sUhhVZkzi5eFVoWstjC';

function generateRefreshToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashRefreshToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

// sid: session of the token. A revoked session ends at the next refresh; this one just expires.
function generateAccessToken(user, sessionId) {
  const { JWT_SECRET } = process.env;

  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      sid: sessionId,
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    },
  );
}

function getRefreshTokenExpiration() {
  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS,
  );

  return expiresAt;
}

// New refresh token for a session; returns the plain token (only its hash is stored)
async function issueRefreshToken(session, ip, tx) {
  const refreshToken = generateRefreshToken();

  await refreshTokenRepository.create({
    userId: session.userId,
    sessionId: session.id,
    tokenHash: hashRefreshToken(refreshToken),
    ip,
    expiresAt: getRefreshTokenExpiration(),
  }, tx);

  return refreshToken;
}

const authService = {

  // client: { ip, userAgent } of the request (see utils/requestInfo)
  async login(userLoggingIn, client) {
    const user = await userRepository.findByUsername(userLoggingIn.username);

    const valid = await bcrypt.compare(userLoggingIn.password, user?.password ?? DUMMY_HASH);

    if (!user || !valid) {
      return null;
    }

    const { session, refreshToken } = await db.transaction(async (tx) => {
      const created = await userSessionRepository.create({
        userId: user.id,
        createdIp: client.ip,
        lastIp: client.ip,
        userAgent: client.userAgent,
      }, tx);

      return {
        session: created,
        refreshToken: await issueRefreshToken(created, client.ip, tx),
      };
    });

    return {
      accessToken: generateAccessToken(user, session.id),
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  },

  // Returns { status: 'ok', accessToken, refreshToken }, { status: 'concurrent' } (another request
  // just rotated this token: the client already has the new one) or null (invalid: log in again).
  async refresh(refreshToken, client) {
    const found = await refreshTokenRepository.findByTokenHash(hashRefreshToken(refreshToken));

    if (!found) {
      return null;
    }

    const { token, session } = found;
    const now = new Date();

    if (session.revokedAt !== null || token.expiresAt <= now) {
      return null;
    }

    if (token.rotatedAt !== null) {
      if (now - token.rotatedAt <= ROTATION_GRACE_MS) {
        return { status: 'concurrent' };
      }

      // Rotated long ago and presented again: someone has a copy. End the whole session,
      // for the thief and for the legitimate client.
      await userSessionRepository.revoke(session.id, 'reuse');

      logger.warn({
        message: 'Refresh token reuse detected, session revoked',
        userId: session.userId,
        sessionId: session.id,
        ip: client.ip,
      });

      return null;
    }

    const user = await userRepository.findById(session.userId);

    if (!user) {
      return null;
    }

    const newRefreshToken = await db.transaction(async (tx) => {
      const rotated = await refreshTokenRepository.markRotated(token.id, now, tx);

      // Lost the race against a concurrent refresh with the same token
      if (!rotated) {
        return null;
      }

      await userSessionRepository.touch(session.id, client, tx);

      return issueRefreshToken(session, client.ip, tx);
    });

    if (!newRefreshToken) {
      return { status: 'concurrent' };
    }

    return {
      status: 'ok',
      accessToken: generateAccessToken(user, session.id),
      refreshToken: newRefreshToken,
    };
  },

  async logout(refreshToken) {
    const found = await refreshTokenRepository.findByTokenHash(hashRefreshToken(refreshToken));

    if (!found) {
      return;
    }

    await userSessionRepository.revoke(found.session.id, 'logout');
  },

  // Weekly job: expired tokens, then the sessions left without any
  async cleanup() {
    return db.transaction(async (tx) => {
      const tokens = await refreshTokenRepository.deleteExpired(new Date(), tx);
      const sessions = await userSessionRepository.deleteWithoutTokens(tx);

      return { tokens, sessions };
    });
  },

  async getCurrentUser(userId) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404);
    }

    return user;
  },

};

export default authService;
