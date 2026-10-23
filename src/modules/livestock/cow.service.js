import db from '../../shared/db/drizzle';

import cowRepository from './cow.repository';
import collarRepository from '../devices/collar.repository';
import cowCollarAssignmentService from './cowCollarAssignment.service';

import AppError from '../../shared/errors/AppError';
import imageService from './image.service';
import cowGroupMembershipService from './cowGroupMembership.service';
import groupRepository from './group.repository';
import cowGroupMembershipRepository from './cowGroupMembership.repository';
import categoryRepository from './category.repository';
import breedRepository from './breed.repository';

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

// The category must exist and be for the cow's sex. The database enforces it too (composite FK),
// this gives a clear error instead of a constraint violation.
async function validateCategory({ categoryId, sex }, tx) {
  if (categoryId === null || categoryId === undefined) {
    return;
  }

  if (!sex) {
    throw new AppError('SEX_REQUIRED_FOR_CATEGORY', 400);
  }

  const category = await categoryRepository.findById(categoryId, tx);

  if (!category) {
    throw new AppError('CATEGORY_NOT_FOUND', 404);
  }

  if (category.sex !== sex) {
    throw new AppError('CATEGORY_SEX_MISMATCH', 400);
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

    // Resolved for the cow card: names, not only ids
    const [groups, breed, category, collar] = await Promise.all([
      groupRepository.findAll({ where: { id: { in: groupsIds } } }),
      cow.breedId ? breedRepository.findById(cow.breedId) : null,
      cow.categoryId ? categoryRepository.findById(cow.categoryId) : null,
      cow.currentCollarId ? collarRepository.findById(cow.currentCollarId) : null,
    ]);

    return {
      ...cow,
      groups,
      breed,
      category,
      collar: collar && { id: collar.id, code: collar.code },
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
        await validateCategory(cow, tx);

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
        // Category and sex are checked together: the result of the update must agree
        if (values.categoryId !== undefined || values.sex !== undefined) {
          const current = await cowRepository.findById(cowId, tx);

          if (!current) {
            throw new AppError('COW_NOT_FOUND', 404);
          }

          await validateCategory({
            categoryId: values.categoryId !== undefined ? values.categoryId : current.categoryId,
            sex: values.sex ?? current.sex,
          }, tx);
        }

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
