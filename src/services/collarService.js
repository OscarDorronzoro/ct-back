import db from '../db/drizzle';
import collarRepository from '../repositories/collarRepository';
import cowCollarAssignmentService from './cowCollarAssignmentService';

import AppError from '../errors/AppError';

const collarService = {

  async delete(collarId) {
    return db.transaction(async (tx) => {
      const collar = collarRepository.delete(collarId, tx);

      if (!collar) {
        throw new AppError('COLLAR_NOT_FOUND', 404);
      }

      const now = new Date();

      await cowCollarAssignmentService.closeByCollar(
        collarId,
        now,
        tx,
      );

      return collar;
    });
  },

};

export default collarService;
