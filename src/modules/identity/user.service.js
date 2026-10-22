import bcrypt from 'bcrypt';

import db from '../../shared/db/drizzle';
import userRepository from './user.repository';
import userSessionRepository from './session.repository';
import ROLES from './roles.constants';
import AppError from '../../shared/errors/AppError';

const SALT_ROUNDS = 12;

// There must always be an admin: the user can't be the last one. The admin rows stay locked until
// the transaction ends, so two admins removing each other at once can't both succeed.
async function assertNotLastAdmin(userId, tx) {
  const adminIds = await userRepository.lockAdminIds(tx);

  if (adminIds.includes(userId) && adminIds.every((id) => id === userId)) {
    throw new AppError('LAST_ADMIN', 409);
  }
}

// Only users with users:manage (admins) get here: they can manage any user, except leaving
// themselves without the admin role or deleting themselves (so nobody locks themselves out by
// mistake), and never leaving the system without an admin.
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
        if (!roles.includes(ROLES.ADMIN)) {
          if (userId === authenticatedUser.sub) {
            throw new AppError('CANNOT_REMOVE_OWN_ADMIN_ROLE', 400);
          }

          await assertNotLastAdmin(userId, tx);
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

    return db.transaction(async (tx) => {
      await assertNotLastAdmin(userId, tx);

      const user = await userRepository.delete(userId, tx);

      if (!user) {
        throw new AppError('USER_NOT_FOUND', 404);
      }

      return user;
    });
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
