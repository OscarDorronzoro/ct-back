import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import firmwareRepository from '../repositories/firmwareRepository';
import AppError from '../errors/AppError';

const FIRMWARE_ROOT = process.env.FIRMWARE_ROOT || '/var/lib/cattle_tracker/firmwares';

// Folder of the binaries, for res.sendFile({ root }): files are served by name, never by path
export const FIRMWARE_DIR = path.resolve(FIRMWARE_ROOT);

// First byte of an ESP32/ESP8266 application image
const ESP_IMAGE_MAGIC = 0xe9;

const PG_UNIQUE_VIOLATION = '23505';

function hash(algorithm, buffer) {
  return crypto.createHash(algorithm).update(buffer).digest('hex');
}

const firmwareService = {

  async getAll() {
    return firmwareRepository.findAll();
  },

  async get(id) {
    return firmwareRepository.findById(id);
  },

  // values: { code, version, notes } validated by firmwareValidator.
  // file: multer file (memory storage), checked here
  async create(values, file, userId) {
    const { code } = values;

    if (!file?.buffer?.length || file.buffer[0] !== ESP_IMAGE_MAGIC) {
      throw new AppError('INVALID_FIRMWARE', 400, 'file must be an ESP firmware image (.bin)');
    }

    if (await firmwareRepository.findByCode(code)) {
      throw new AppError('FIRMWARE_CODE_IN_USE', 409);
    }

    const filename = `fw_${code}_${values.version}.bin`;
    const filepath = path.join(FIRMWARE_ROOT, filename);

    await fs.writeFile(filepath, file.buffer, { flag: 'wx' });

    try {
      return await firmwareRepository.create({
        code,
        version: values.version,
        filename,
        size: file.buffer.length,
        md5: hash('md5', file.buffer),
        sha256: hash('sha256', file.buffer),
        notes: values.notes,
        createdBy: userId,
      });
    } catch (err) {
      await fs.unlink(filepath);

      if ((err.cause?.code ?? err.code) === PG_UNIQUE_VIOLATION) {
        throw new AppError('FIRMWARE_VERSION_IN_USE', 409);
      }

      throw err;
    }
  },

  // The file is kept: commands already delivered may still download it
  async delete(id) {
    return firmwareRepository.delete(id);
  },

  // Firmware whose binary is available (its file is FIRMWARE_DIR/filename), or null
  async getFile(code) {
    const firmware = await firmwareRepository.findByCode(code);

    if (!firmware) {
      return null;
    }

    const filepath = path.join(FIRMWARE_ROOT, firmware.filename);

    try {
      await fs.access(filepath);
    } catch {
      return null;
    }

    return firmware;
  },

};

export default firmwareService;
