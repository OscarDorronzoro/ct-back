import db from '../db/drizzle';
import collarRepository from '../repositories/collarRepository';
import cowCollarAssignmentService from './cowCollarAssignmentService';
import commandService from './commandService';

import AppError from '../errors/AppError';
import logger from '../utils/logger';

const MIN_CODE = 1;
const MAX_CODE = 255;

const PG_UNIQUE_VIOLATION = '23505';

// Codes never used come first: a deleted collar may still be transmitting with its code
async function allocateCode(tx) {
  const rows = await collarRepository.findAllCodes(tx);

  const active = new Set(rows.filter((r) => !r.deletedAt).map((r) => r.code));
  const everUsed = new Set(rows.map((r) => r.code));

  let fallback = null;

  for (let code = MIN_CODE; code <= MAX_CODE; code += 1) {
    if (!everUsed.has(code)) {
      return code;
    }

    if (fallback === null && !active.has(code)) {
      fallback = code;
    }
  }

  if (fallback === null) {
    throw new AppError('NO_FREE_COLLAR_CODE', 409);
  }

  return fallback;
}

async function checkUnique(values, collarId, tx) {
  if (values.code !== undefined) {
    const collar = await collarRepository.findByCode(values.code, tx);

    if (collar && collar.id !== collarId) {
      throw new AppError('COLLAR_CODE_IN_USE', 409);
    }
  }

  if (values.mac) {
    const collar = await collarRepository.findByMac(values.mac, tx);

    if (collar && collar.id !== collarId) {
      throw new AppError('COLLAR_MAC_IN_USE', 409);
    }
  }
}

const collarService = {

  async create(values) {
    return db.transaction(async (tx) => {
      await checkUnique(values, null, tx);

      const code = values.code ?? await allocateCode(tx);

      return collarRepository.create({ ...values, code }, tx);
    });
  },

  async update(collarId, values) {
    return db.transaction(async (tx) => {
      await checkUnique(values, collarId, tx);

      return collarRepository.update(collarId, values, tx);
    });
  },

  async delete(collarId) {
    return db.transaction(async (tx) => {
      const collar = await collarRepository.delete(collarId, tx);

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

  // A collar without code asks for one (join). Creates the collar the first time its mac is seen,
  // and queues the assignCode command.
  async join(mac, retry = true) {
    try {
      return await db.transaction(async (tx) => {
        let collar = await collarRepository.findByMac(mac, tx);

        if (!collar) {
          const now = new Date();

          collar = await collarRepository.create({
            code: await allocateCode(tx),
            mac,
            description: 'Alta automática (join)',
            createdAt: now,
            updatedAt: now,
          }, tx);

          logger.info({
            message: 'Collar created by join',
            collarId: collar.id,
            code: collar.code,
            mac,
          });
        }

        await commandService.createAssignCode(collar, tx);

        return collar;
      });
    } catch (err) {
      // Two gateways got the same join at once: the other one created the collar
      if (retry && (err.cause?.code ?? err.code) === PG_UNIQUE_VIOLATION) {
        return collarService.join(mac, false);
      }

      throw err;
    }
  },

};

export default collarService;
