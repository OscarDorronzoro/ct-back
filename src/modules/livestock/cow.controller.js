import cowService from './cow.service';
import missingCowPermission from './cowPermission.util';
import AppError from '../../shared/errors/AppError';

// Validated form -> cow columns, and what cowService handles apart (image, groups)
function splitCowForm(form, file) {
  const { groupIds, removeImage, ...cow } = form;
  const cowData = {};

  if (groupIds !== undefined) {
    cowData.groupIds = groupIds;
  }

  // A new image replaces the old one; removeImage only applies without one
  if (file) {
    cowData.image = file;
  } else if (removeImage) {
    cowData.image = null;
  }

  return { cow, cowData };
}

// Each field needs its permission (see cowPermission.util)
function checkCowFields(cow, cowData, user) {
  const fields = [...Object.keys(cow), ...Object.keys(cowData)]
    .filter((field) => cow[field] !== undefined || cowData[field] !== undefined);

  const missing = missingCowPermission(fields, user.permissions);

  if (missing) {
    throw new AppError('FORBIDDEN', 403, `Missing permission: ${missing}`);
  }
}

function cowController() {
  async function get(req, res, next) {
    try {
      const { cowId } = req.validated.params;

      const cow = await cowService.get(cowId);

      if (!cow) {
        return res.status(404)
          .json({ error: 'Cow not found' });
      }

      return res.status(200)
        .json(cow);
    } catch (err) {
      return next(err);
    }
  }

  async function getAll(req, res, next) {
    try {
      const cows = await cowService.getAll();

      return res.status(200)
        .json(cows);
    } catch (err) {
      return next(err);
    }
  }

  async function post(req, res, next) {
    try {
      const { cow, cowData } = splitCowForm(req.validated.body, req.file);

      // New cow: without a collar unless one is chosen
      if (cow.currentCollarId === null) {
        delete cow.currentCollarId;
      }

      checkCowFields(cow, cowData, req.user);

      const cowCreated = await cowService.create(cow, { ...cowData, userId: req.user.sub });

      return res.status(201)
        .json({ cow: cowCreated });
    } catch (err) {
      return next(err);
    }
  }

  async function put(req, res, next) {
    const { cowId } = req.validated.params;

    try {
      // currentCollarId null: unassign the current collar
      const { cow, cowData } = splitCowForm(req.validated.body, req.file);

      checkCowFields(cow, cowData, req.user);

      cow.updatedAt = new Date();

      const cowReturned = await cowService.update(cowId, cow, { ...cowData, userId: req.user.sub });

      return res.status(200)
        .json({ cow: cowReturned });
    } catch (err) {
      return next(err);
    }
  }

  async function del(req, res, next) {
    const { cowId } = req.validated.params;

    try {
      const cow = await cowService.delete(cowId);

      if (!cow) {
        return res.status(404)
          .json({ error: 'Cow not found' });
      }

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }

  return {
    get,
    getAll,
    post,
    put,
    del,
  };
}

export default cowController;
