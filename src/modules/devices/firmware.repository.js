import {
  eq, ne, and, or, isNull, desc, exists, sql,
} from 'drizzle-orm';

import db from '../../shared/db/drizzle';
import firmwares from './firmware.schema';
import commands from './command.schema';
import commandTargets from './commandTarget.schema';

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

  // Binaries that must be kept: firmwares not deleted, and deleted ones that an unfinished OTA
  // command still points to (the gateway may be downloading it)
  async findFilenamesInUse(tx = db) {
    const openOta = tx
      .select({ id: commandTargets.id })
      .from(commandTargets)
      .innerJoin(commands, eq(commands.id, commandTargets.commandId))
      .where(and(
        eq(commands.type, 'ota'),
        sql`(${commands.payload}->>'firmwareId')::int = ${firmwares.id}`,
        ne(commandTargets.status, 'done'),
      ));

    const rows = await tx
      .select({ filename: firmwares.filename })
      .from(firmwares)
      .where(or(
        isNull(firmwares.deletedAt),
        exists(openOta),
      ));

    return new Set(rows.map((row) => row.filename));
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
