import multer from 'multer';

const manageMulti = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export default manageMulti;
