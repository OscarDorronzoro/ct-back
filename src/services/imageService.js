import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import AppError from '../errors/AppError';

const IMAGE_ROOT = process.env.IMAGE_ROOT || '/var/lib/cattle_tracker/images';

const COW_IMAGE_DIR = path.join(
  IMAGE_ROOT,
  'cows',
);

const prefix = '/images/cows/';

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
};

export default imageService;
