import db from '../db/drizzle';

import cowRepository from '../repositories/cowRepository';
import collarRepository from '../repositories/collarRepository';
import cowCollarAssignmentService from './cowCollarAssignmentService';

import AppError from '../errors/AppError';
import imageService from './imageService';
import cowGroupMembershipService from './cowGroupMembershipService';
import groupRepository from '../repositories/groupRepository';
import cowGroupMembershipRepository from '../repositories/cowGroupMembershipRepository';

async function validateGroups(groupIds, tx) {
  if (groupIds.length === 0) {
    return;
  }

  const groups = await groupRepository.findAll({
    where: {
      id: {
        in: groupIds,
      },
    },
  }, tx);

  if (groupIds.length !== groups.length) {
    throw new AppError('GROUP_NOT_FOUND', 404);
  }
}

const cowService = {

  async get(cowId) {
    const cow = await cowRepository.findById(cowId);

    if (!cow) {
      throw new AppError('COW_NOT_FOUND', 404);
    }

    const cowMemberships = await cowGroupMembershipRepository.findByCowIdAtDate(cowId, new Date());
    const groupsIds = cowMemberships.map((m) => m.groupId);
    const groups = await groupRepository.findAll({
      where: {
        id: {
          in: groupsIds,
        },
      },
    });

    return {
      ...cow,
      groups,
    };
  },

  async getAll() {
    const rows = await cowGroupMembershipRepository
      .getAllCowsWithGroupsAtDate();

    const cowsMap = rows.reduce((map, row) => {
      if (!map.has(row.cow.id)) {
        map.set(row.cow.id, {
          ...row.cow,
          groups: [],
        });
      }

      if (row.group) {
        map.get(row.cow.id).groups.push(row.group);
      }

      return map;
    }, new Map());

    return [...cowsMap.values()];
  },

  async create(cow, data) {
    let imageUrl;

    try {
      return db.transaction(async (tx) => {
        // Create cow
        const cowCreated = await cowRepository.create(cow, tx);

        // Manage collar assingment
        if (cow.currentCollarId !== undefined) {
          const { currentCollarId } = cow;

          if (currentCollarId === null) {
            throw new AppError(
              'REMOVE_COLLAR_UNIMPLEMENTED',
              400,
            );
          }

          const collar = await collarRepository.findById(currentCollarId, tx);
          if (!collar) {
            throw new AppError('COLLAR_NOT_FOUND', 404);
          }

          await cowCollarAssignmentService.assign(
            cowCreated.id,
            currentCollarId,
            tx,
          );
        }

        // Manage image
        if (data.image) {
          imageUrl = await imageService.saveCowImage(data.image);

          await cowRepository.update(cowCreated.id, { imageUrl }, tx);
          cowCreated.imageUrl = imageUrl;
        }

        // Manage group memberships
        if (data.groupIds !== undefined) {
          await validateGroups(data.groupIds, tx);

          await cowGroupMembershipService.sync(cowCreated.id, data.groupIds, tx);
        }

        return cowCreated;
      });
    } catch (err) {
      if (imageUrl) {
        await imageService.deleteCowImage(imageUrl);
      }

      throw err;
    }
  },

  async update(cowId, values, data) {
    let imageUrl;
    let oldImageUrl;

    try {
      const cow = await db.transaction(async (tx) => {
        // Update cow
        const cowUpdated = await cowRepository.update(cowId, values, tx);

        if (!cowUpdated) {
          throw new AppError(
            'COW_NOT_FOUND',
            404,
          );
        }

        oldImageUrl = cowUpdated.imageUrl;

        // Manage collar assignment
        if (values.currentCollarId !== undefined) {
          const { currentCollarId } = values;

          if (currentCollarId === null) {
            throw new AppError(
              'REMOVE_COLLAR_UNIMPLEMENTED',
              400,
            );
          }

          await cowCollarAssignmentService.assign(
            cowId,
            currentCollarId,
            tx,
          );
        }

        // Manage image
        if (data.image !== undefined) {
          if (data.image === null) {
            throw new AppError(
              'REMOVE_IMAGE_UNIMPLEMENTED',
              400,
            );
          }

          imageUrl = await imageService.saveCowImage(data.image);

          await cowRepository.update(
            cowUpdated.id,
            { imageUrl },
            tx,
          );

          cowUpdated.imageUrl = imageUrl;
        }

        // Manage group memberships
        if (data.groupIds !== undefined) {
          await validateGroups(data.groupIds, tx);

          await cowGroupMembershipService.sync(
            cowId,
            data.groupIds,
            tx,
          );
        }

        return cowUpdated;
      });

      if (imageUrl && oldImageUrl) {
        await imageService.deleteCowImage(oldImageUrl);
      }

      return cow;
    } catch (err) {
      if (imageUrl) {
        await imageService.deleteCowImage(imageUrl);
      }

      throw err;
    }
  },

  async delete(cowId) {
    return db.transaction(async (tx) => {
      const cow = await cowRepository.delete(cowId, tx);

      if (!cow) {
        throw new AppError('COW_NOT_FOUND', 404);
      }

      const now = cow.deletedAt;

      // Close collar
      await cowCollarAssignmentService.closeByCow(
        cowId,
        now,
        tx,
      );

      // Close groups
      await cowGroupMembershipService.closeAll(
        cowId,
        now,
        tx,
      );

      return cow;
    });
  },
};

export default cowService;
