import db from '../../shared/db/drizzle';
import groupRepository from './group.repository';

import AppError from '../../shared/errors/AppError';

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
