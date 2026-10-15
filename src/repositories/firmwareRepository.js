import {
  eq, and, isNull, desc,
} from 'drizzle-orm';

import db from '../db/drizzle';
import firmwares from '../schema/firmwares';

const firmwareRepository = {

  async findAll(tx = db) {
    return tx
      .select()
      .from(firmwares)
      .where(isNull(firmwares.deletedAt))
      .orderBy(desc(firmwares.code));
  },

  async findById(id, tx = db) {
    const [result] = await tx
      .select()
      .from(firmwares)
      .where(and(
        eq(firmwares.id, id),
        isNull(firmwares.deletedAt),
      ));

    return result ?? null;
  },

  // Deleted included: collars may report or still be downloading a deleted firmware
  async findByCode(code, tx = db) {
    const [result] = await tx
      .select()
      .from(firmwares)
      .where(eq(firmwares.code, code));

    return result ?? null;
  },

  async findByVersion(version, tx = db) {
    const [result] = await tx
      .select()
      .from(firmwares)
      .where(and(
        eq(firmwares.version, version),
        isNull(firmwares.deletedAt),
      ));

    return result ?? null;
  },

  async findLatest(tx = db) {
    const [result] = await tx
      .select()
      .from(firmwares)
      .where(isNull(firmwares.deletedAt))
      .orderBy(desc(firmwares.code))
      .limit(1);

    return result ?? null;
  },

  async create(firmware, tx = db) {
    const [created] = await tx
      .insert(firmwares)
      .values(firmware)
      .returning();

    return created;
  },

  async delete(id, tx = db) {
    const [deleted] = await tx
      .update(firmwares)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(firmwares.id, id),
        isNull(firmwares.deletedAt),
      ))
      .returning();

    return deleted ?? null;
  },

};

export default firmwareRepository;
