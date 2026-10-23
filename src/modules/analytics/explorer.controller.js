import explorerService from './explorer.service';

function explorerController() {
  function getCatalog(req, res) {
    return res.status(200).json(explorerService.catalog(req.user.permissions));
  }

  async function postQuery(req, res, next) {
    try {
      const result = await explorerService.run(req.validated.body, req.user.permissions);

      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  async function getValues(req, res, next) {
    try {
      const values = await explorerService.values(req.validated.query, req.user.permissions);

      return res.status(200).json(values);
    } catch (err) {
      return next(err);
    }
  }

  return { getCatalog, postQuery, getValues };
}

export default explorerController;
