import db from '../../shared/db/drizzle';

import cowRepository from './cow.repository';
import collarRepository from '../devices/collar.repository';
import cowCollarAssignmentService from './cowCollarAssignment.service';

import AppError from '../../shared/errors/AppError';
import imageService from './image.service';
import cowGroupMembershipService from './cowGroupMembership.service';
import groupRepository from './group.repository';
import cowGroupMembershipRepository from './cowGroupMembership.repository';

import logger from '../../shared/utils/logger';

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

async function deleteImageOrRegisterOrphan(imageUrl, cowId) {
  try {
    await imageService.deleteCowImage(imageUrl);
  } catch (err) {
    logger.error({
      message: 'Failed to delete cow image',
      imageUrl,
      cowId,
      error: err,
    });

    try {
      await imageService.registerOrphanImage(imageUrl, cowId, err);
    } catch (registerErr) {
      logger.error({
        message: 'Failed to register orphan image',
        imageUrl,
        cowId,
        error: registerErr,
      });
    }
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
      const created = await db.transaction(async (tx) => {
        // Create cow
        const cowCreated = await cowRepository.create(cow, tx);

        // Manage collar assingment
        if (cow.currentCollarId !== undefined) {
          const { currentCollarId } = cow;

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

      return created;
    } catch (err) {
      if (imageUrl) {
        await deleteImageOrRegisterOrphan(imageUrl, null);
      }

      throw err;
    }
  },

  async update(cowId, values, data) {
    let imageUrl;
    let oldImageUrl;
    let imageRemoved = false;

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
            await cowCollarAssignmentService.closeByCow(cowId, new Date(), tx);
          } else {
            await cowCollarAssignmentService.assign(
              cowId,
              currentCollarId,
              tx,
            );
          }
        }

        // Manage image
        if (data.image !== undefined) {
          if (data.image === null) {
            if (oldImageUrl) {
              await cowRepository.update(cowUpdated.id, { imageUrl: null }, tx);
              cowUpdated.imageUrl = null;
              imageRemoved = true;
            }
          } else {
            imageUrl = await imageService.saveCowImage(data.image);

            await cowRepository.update(
              cowUpdated.id,
              { imageUrl },
              tx,
            );

            cowUpdated.imageUrl = imageUrl;
          }
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

      // The file goes once the database no longer points to it
      if (oldImageUrl && (imageUrl || imageRemoved)) {
        await deleteImageOrRegisterOrphan(oldImageUrl, cowId);
      }

      return cow;
    } catch (err) {
      if (imageUrl) {
        await deleteImageOrRegisterOrphan(imageUrl, cowId);
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
