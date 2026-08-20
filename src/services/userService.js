import bcrypt from 'bcrypt';

import db from '../db/drizzle';
import userRepository from '../repositories/userRepository';
import AppError from '../errors/AppError';

const SALT_ROUNDS = 12;

const userService = {

  async create(values, authenticatedUserRole) {
    return db.transaction(async (tx) => {
      const data = { ...values };

      if (data.role < authenticatedUserRole) {
        throw new AppError('INSUFFICIENT_PERMISSIONS', 403);
      }

      if (data.password !== undefined) {
        data.password = await bcrypt.hash(
          data.password,
          SALT_ROUNDS,
        );
      }

      const existingUser = await userRepository.checkUsernameExists(data.username, tx);

      if (existingUser) {
        throw new AppError('USERNAME_ALREADY_EXISTS', 409);
      }

      return userRepository.create(data, tx);
    });
  },

  async update(userId, values, authenticatedUserRole) {
    return db.transaction(async (tx) => {
      const user = await userRepository.findById(userId, tx);

      if (!user) {
        throw new AppError('USER_NOT_FOUND', 404);
      }

      const data = { ...values };

      if (user.role < authenticatedUserRole) {
        throw new AppError('INSUFFICIENT_PERMISSIONS', 403);
      }

      if (data.role !== undefined && data.role < authenticatedUserRole) {
        throw new AppError('INSUFFICIENT_PERMISSIONS', 403);
      }

      if (data.password !== undefined) {
        data.password = await bcrypt.hash(
          data.password,
          SALT_ROUNDS,
        );
      }

      return userRepository.update(userId, data, tx);
    });
  },

  async delete(userId, authenticatedUserRole) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404);
    }

    if (user.role < authenticatedUserRole) {
      throw new AppError('INSUFFICIENT_PERMISSIONS', 403);
    }

    return userRepository.delete(userId);
  },

  async get(userId) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404);
    }

    return user;
  },

  async getAll() {
    return userRepository.findAll();
  },
};

export default userService;
