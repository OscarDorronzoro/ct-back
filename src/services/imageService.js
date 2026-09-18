import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import AppError from '../errors/AppError';
import logger from '../utils/logger';

const IMAGE_ROOT = process.env.IMAGE_ROOT || '/var/lib/cattle_tracker/images';

const COW_IMAGE_DIR = path.join(
  IMAGE_ROOT,
  'cows',
);

const prefix = '/images/cows/';

const ORPHAN_IMAGES_LOG = path.join(
  IMAGE_ROOT,
  'logs',
  'orphan-images.log',
);
const ORPHAN_IMAGES_TEMP_LOG = `${ORPHAN_IMAGES_LOG}.tmp`;

async function readOrphanImages() {
  let content;

  try {
    content = await fs.readFile(ORPHAN_IMAGES_LOG, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }

    throw err;
  }

  const formattedContent = content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return {
          line,
          data: JSON.parse(line),
        };
      } catch (err) {
        logger.error({
          message: 'Invalid orphan image log entry',
          line,
          error: err,
        });

        return {
          line,
          data: null,
        };
      }
    });

  return formattedContent;
}

const imageService = {
  async saveCowImage(file) {
    const filename = `${new Date().getTime()}_${crypto.randomUUID()}.webp`;

    const filepath = path.join(
      COW_IMAGE_DIR,
      filename,
    );

    await sharp(file.buffer)
      .rotate()
      .resize({
        width: 800,
        height: 800,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality: 80,
      })
      .toFile(filepath);

    return `${prefix}${filename}`;
  },

  async deleteCowImage(imageUrl) {
    if (!imageUrl) {
      throw new AppError('INVALID_IMAGE', 400);
    }

    if (!imageUrl.startsWith(prefix)) {
      throw new AppError('INVALID_IMAGE', 400);
    }

    const filename = imageUrl.slice(prefix.length);

    if (!/^\d+_[0-9a-f-]+\.webp$/i.test(filename)) {
      throw new Error('INVALID_IMAGE', 400);
    }

    const filepath = path.join(
      COW_IMAGE_DIR,
      filename,
    );

    try {
      await fs.unlink(filepath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  },

  async registerOrphanImage(imageUrl, cowId, error) {
    const entry = {
      timestamp: new Date().toISOString(),
      imageUrl,
      cowId,
      error: error?.message,
    };

    await fs.appendFile(
      ORPHAN_IMAGES_LOG,
      `${JSON.stringify(entry)}\n`,
      'utf8',
    );
  },

  async processOrphanImages() {
    const entries = await readOrphanImages();

    if (entries.length === 0) {
      return;
    }

    const failedEntries = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const entry of entries) {
      if (!entry.data) {
        failedEntries.push(entry.line);
        // eslint-disable-next-line no-continue
        continue;
      }

      const {
        imageUrl,
        cowId,
      } = entry.data;

      try {
        // eslint-disable-next-line no-await-in-loop
        await imageService.deleteCowImage(imageUrl);

        logger.info({
          message: 'Orphan cow image deleted',
          imageUrl,
          cowId,
        });
      } catch (err) {
        logger.error({
          message: 'Failed to delete orphan cow image',
          imageUrl,
          cowId,
          error: err,
        });

        failedEntries.push(entry.line);
      }
    }

    const content = failedEntries.length > 0
      ? `${failedEntries.join('\n')}\n`
      : '';

    await fs.writeFile(
      ORPHAN_IMAGES_TEMP_LOG,
      content,
      'utf8',
    );

    await fs.rename(
      ORPHAN_IMAGES_TEMP_LOG,
      ORPHAN_IMAGES_LOG,
    );

    logger.info({
      message: 'Orphan image cleanup completed',
      processed: entries.length,
      failed: failedEntries.length,
    });
  },

};

export default imageService;
