import db from '../db/drizzle';

import breedRepository from '../repositories/breedRepository';
import AppError from '../errors/AppError';

const breedService = {
  async create(values) {
    return db.transaction(async (tx) => {
      const existingBreed = await breedRepository.findByName(
        values.name,
        tx,
      );

      if (existingBreed) {
        throw new AppError('BREED_ALREADY_EXISTS', 409);
      }

      return breedRepository.create(values, tx);
    });
  },

  async update(breedId, values) {
    return db.transaction(async (tx) => {
      const breed = await breedRepository.findById(breedId, tx);

      if (!breed) {
        throw new AppError('BREED_NOT_FOUND', 404);
      }

      if (values.name !== undefined) {
        const existingBreed = await breedRepository.findByName(
          values.name,
          tx,
        );

        if (existingBreed && existingBreed.id !== breedId) {
          throw new AppError('BREED_ALREADY_EXISTS', 409);
        }
      }

      return breedRepository.update(breedId, values, tx);
    });
  },

  async delete(breedId) {
    return db.transaction(async (tx) => {
      const breed = await breedRepository.delete(breedId, tx);

      if (!breed) {
        throw new AppError('BREED_NOT_FOUND', 404);
      }

      return breed;
    });
  },
};

export default breedService;
