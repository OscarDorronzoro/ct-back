import multer from 'multer';

// ESP32 application images are up to ~2 MB (default OTA partition 1.25 MB)
const manageFirmwareUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 4 * 1024 * 1024,
  },
});

export default manageFirmwareUpload;
