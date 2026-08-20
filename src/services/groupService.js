import db from '../db/drizzle';
import groupRepository from '../repositories/groupRepository';

import AppError from '../errors/AppError';

const groupService = {

  async delete(groupId) {
    return db.transaction(async (tx) => {
      const group = await groupRepository.delete(groupId, tx);

      if (!group) {
        throw new AppError('GROUP_NOT_FOUND', 404);
      }

      return group;
    });
  },

};

export default groupService;
