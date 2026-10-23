import db from '../../shared/db/drizzle';
import AppError from '../../shared/errors/AppError';
import animalEventRepository from './animalEvent.repository';
import productRepository from './product.repository';
import cowRepository from '../livestock/cow.repository';
import { PRODUCT_TYPES_BY_EVENT } from './health.constants';
import { withdrawalUntil, healthSummary } from './health.util';

// Product of a vaccination or treatment: exists, still in use and of a type for the event
async function checkProduct(type, productId, tx) {
  const product = await productRepository.findById(productId, tx);

  if (!product) {
    throw new AppError('PRODUCT_NOT_FOUND', 404);
  }

  if (!product.active) {
    throw new AppError('PRODUCT_INACTIVE', 400);
  }

  if (!PRODUCT_TYPES_BY_EVENT[type].includes(product.type)) {
    throw new AppError('PRODUCT_TYPE_MISMATCH', 400);
  }

  return product;
}

const healthService = {
  // Clinical history: the events and what they mean today
  async getCowHealth(cowId) {
    const cow = await cowRepository.findById(cowId);

    if (!cow) {
      throw new AppError('COW_NOT_FOUND', 404);
    }

    const events = await animalEventRepository.findByCow(cowId);

    return { summary: healthSummary(events), events };
  },

  // body validated by createEventBody: { type, occurredAt, notes, ...fields of the type }
  async recordEvent(cowId, body, userId) {
    const {
      type, occurredAt, notes, ...details
    } = body;

    return db.transaction(async (tx) => {
      const cow = await cowRepository.findById(cowId, tx);

      if (!cow) {
        throw new AppError('COW_NOT_FOUND', 404);
      }

      if (PRODUCT_TYPES_BY_EVENT[type]) {
        const product = await checkProduct(type, details.productId, tx);
        const days = details.durationDays ?? 1;

        details.meatWithdrawalUntil = withdrawalUntil(occurredAt, product.meatWithdrawalDays, days);
        details.milkWithdrawalUntil = withdrawalUntil(occurredAt, product.milkWithdrawalDays, days);
      }

      const eventId = await animalEventRepository.create({
        cowId, type, occurredAt, notes, recordedBy: userId,
      }, details, tx);

      return animalEventRepository.findById(eventId, tx);
    });
  },

  // A wrong event is not deleted: it stays in the history, voided, with the reason
  async voidEvent(eventId, reason, userId) {
    return db.transaction(async (tx) => {
      const event = await animalEventRepository.lockById(eventId, tx);

      if (!event) {
        throw new AppError('EVENT_NOT_FOUND', 404);
      }

      if (event.voidedAt) {
        throw new AppError('EVENT_ALREADY_VOIDED', 409);
      }

      await animalEventRepository.void(eventId, { voidedBy: userId, reason }, tx);

      return animalEventRepository.findById(eventId, tx);
    });
  },

  async getProducts(filter) {
    return productRepository.findAll({ activeOnly: filter.active === true });
  },

  async getProduct(productId) {
    const product = await productRepository.findById(productId);

    if (!product) {
      throw new AppError('PRODUCT_NOT_FOUND', 404);
    }

    return product;
  },

  async createProduct(values) {
    return db.transaction(async (tx) => {
      if (await productRepository.findByName(values.name, tx)) {
        throw new AppError('PRODUCT_ALREADY_EXISTS', 409);
      }

      const now = new Date();
      return productRepository.create({
        ...values, active: true, createdAt: now, updatedAt: now,
      }, tx);
    });
  },

  // Changing the withdrawal days doesn't change events already recorded (their dates were computed
  // with the days of then)
  async updateProduct(productId, values) {
    return db.transaction(async (tx) => {
      if (values.name !== undefined) {
        const existing = await productRepository.findByName(values.name, tx);

        if (existing && existing.id !== productId) {
          throw new AppError('PRODUCT_ALREADY_EXISTS', 409);
        }
      }

      const product = await productRepository.update(
        productId,
        { ...values, updatedAt: new Date() },
        tx,
      );

      if (!product) {
        throw new AppError('PRODUCT_NOT_FOUND', 404);
      }

      return product;
    });
  },
};

export default healthService;
