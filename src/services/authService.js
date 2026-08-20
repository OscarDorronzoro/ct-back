import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import userRepository from '../repositories/userRepository';
import refreshTokenRepository from '../repositories/refreshTokenRepository';
import db from '../db/drizzle';

import AppError from '../errors/AppError';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 30;
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

function generateAccessToken(user) {
  const { JWT_SECRET } = process.env;

  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
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

const authService = {

  async login(userLoggingIn) {
    const user = await userRepository.findByUsername(userLoggingIn.username);

    const valid = await bcrypt.compare(userLoggingIn.password, user?.password ?? DUMMY_HASH);

    if (!user || !valid) {
      return null;
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const refreshTokenExpiration = getRefreshTokenExpiration();

    await refreshTokenRepository.create({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: refreshTokenExpiration,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  },

  async refresh(refreshToken) {
    const tokenHash = hashRefreshToken(refreshToken);

    const storedToken = await refreshTokenRepository.findByTokenHash(tokenHash);

    if (!storedToken) {
      return null;
    }

    const now = new Date();
    if (storedToken.revokedAt !== null
      || storedToken.expiresAt <= now
    ) {
      return null;
    }

    const user = await userRepository.findById(
      storedToken.userId,
    );

    if (!user) {
      return null;
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
    const newRefreshTokenExpiration = getRefreshTokenExpiration();

    await db.transaction(async (tx) => {
      await refreshTokenRepository.revoke(
        storedToken.id,
        now,
        tx,
      );

      await refreshTokenRepository.create(
        {
          userId: user.id,
          tokenHash: newRefreshTokenHash,
          expiresAt: newRefreshTokenExpiration,
        },
        tx,
      );
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  },

  async logout(refreshToken) {
    const tokenHash = hashRefreshToken(refreshToken);

    const storedToken = await refreshTokenRepository.findByTokenHash(tokenHash);

    if (!storedToken) {
      return;
    }

    if (storedToken.revokedAt !== null) {
      return;
    }

    await refreshTokenRepository.revoke(
      storedToken.id,
      new Date(),
    );
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
