import cowService from '../services/cowService';

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

      const cowCreated = await cowService.create(cow, cowData);

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

      cow.updatedAt = new Date();

      const cowReturned = await cowService.update(cowId, cow, cowData);

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
