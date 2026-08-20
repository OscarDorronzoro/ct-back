import cowRepository from '../repositories/cowRepository';
import collarRepository from '../repositories/collarRepository';
import cowCollarAssignmentRepository from '../repositories/cowCollarAssignmentRepository';

import AppError from '../errors/AppError';

// cowId, collarId validated in cowService
const cowCollarAssignmentService = {

  async assign(cowId, collarId, tx) {
    const collar = await collarRepository.findById(collarId, tx);

    if (!collar) {
      throw new AppError('COLLAR_NOT_FOUND', 404);
    }

    const now = new Date();

    // Current assignment of this cow
    const currentCowAssignment = await cowCollarAssignmentRepository.findByCowIdAtDate(
      cowId,
      now,
      tx,
    );

    // Current assignment of this collar
    const currentCollarAssignment = await cowCollarAssignmentRepository.findByCollarIdAtDate(
      collarId,
      now,
      tx,
    );

    // Already assigned exactly like requested.
    if (
      currentCowAssignment
      && currentCowAssignment.collarId === collarId
    ) {
      return currentCowAssignment;
    }

    // Close current collar assignment of this cow.
    if (currentCowAssignment) {
      await cowCollarAssignmentRepository.close(
        currentCowAssignment.id,
        now,
        tx,
      );
    }

    // Close current cow assignment of this collar.
    if (currentCollarAssignment) {
      await cowCollarAssignmentRepository.close(
        currentCollarAssignment.id,
        now,
        tx,
      );

      await cowRepository.update(currentCollarAssignment.cowId, { currentCollarId: null }, tx);
    }

    // Create new assignment.
    const assignment = await cowCollarAssignmentRepository.create(
      {
        cowId,
        collarId,
        dateFrom: now,
        dateTo: null,
      },
      tx,
    );

    return assignment;
  },

  async closeByCow(cowId, date, tx) {
    // Current assignment of this cow
    const currentCowAssignment = await cowCollarAssignmentRepository.findByCowIdAtDate(
      cowId,
      date,
      tx,
    );

    // Close current collar assignment of this cow.
    if (currentCowAssignment) {
      await cowCollarAssignmentRepository.close(
        currentCowAssignment.id,
        date,
        tx,
      );
      // Sync cow column
      await cowRepository.update(currentCowAssignment.cowId, { currentCollarId: null }, tx);
    }
  },

  async closeByCollar(collarId, date, tx) {
    // Current assignment of this cow
    const currentCollarAssignment = await cowCollarAssignmentRepository.findByCollarIdAtDate(
      collarId,
      date,
      tx,
    );

    // Close current cow assignment of this collar.
    if (currentCollarAssignment) {
      await cowCollarAssignmentRepository.close(
        currentCollarAssignment.id,
        date,
        tx,
      );
      // Sync cow column
      await cowRepository.update(currentCollarAssignment.cowId, { currentCollarId: null }, tx);
    }
  },

};

export default cowCollarAssignmentService;
