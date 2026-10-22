import bcrypt from 'bcrypt';

import db from '../../shared/db/drizzle';
import userRepository from './user.repository';
import userSessionRepository from './session.repository';
import ROLES from './roles.constants';
import AppError from '../../shared/errors/AppError';

const SALT_ROUNDS = 12;

// Only users with users:manage (admins) get here: they can manage any user, except leaving
// themselves without the admin role or deleting themselves, so there is always an admin.
const userService = {

  async create({ roles, ...values }) {
    return db.transaction(async (tx) => {
      const existingUser = await userRepository.checkUsernameExists(values.username, tx);

      if (existingUser) {
        throw new AppError('USERNAME_ALREADY_EXISTS', 409);
      }

      const { id } = await userRepository.create({
        ...values,
        password: await bcrypt.hash(values.password, SALT_ROUNDS),
      }, tx);

      await userRepository.setRoles(id, roles, tx);

      return userRepository.findById(id, tx);
    });
  },

  // authenticatedUser: { sub, sid } of the caller (their own session is kept on a password change)
  async update(userId, { roles, password }, authenticatedUser) {
    return db.transaction(async (tx) => {
      const user = await userRepository.findById(userId, tx);

      if (!user) {
        throw new AppError('USER_NOT_FOUND', 404);
      }

      if (roles !== undefined) {
        if (userId === authenticatedUser.sub && !roles.includes(ROLES.ADMIN)) {
          throw new AppError('CANNOT_REMOVE_OWN_ADMIN_ROLE', 400);
        }

        await userRepository.setRoles(userId, roles, tx);
      }

      if (password !== undefined) {
        await userRepository.update(userId, {
          password: await bcrypt.hash(password, SALT_ROUNDS),
          updatedAt: new Date(),
        }, tx);

        // New password: whoever had the old one gets logged out everywhere
        await userSessionRepository.revokeAllForUser(
          userId,
          'password',
          { exceptId: authenticatedUser.sid ?? null },
          tx,
        );
      }

      return userRepository.findById(userId, tx);
    });
  },

  async delete(userId, authenticatedUser) {
    if (userId === authenticatedUser.sub) {
      throw new AppError('CANNOT_DELETE_YOURSELF', 400);
    }

    const user = await userRepository.delete(userId);

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404);
    }

    return user;
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
