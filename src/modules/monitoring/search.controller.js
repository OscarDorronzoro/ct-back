import searchService from './search.service';

function searchController() {
  async function get(req, res, next) {
    try {
      const results = await searchService.search(req.validated.query.q, req.user.permissions);

      return res.status(200)
        .json({ results });
    } catch (err) {
      return next(err);
    }
  }

  return {
    get,
  };
}

export default searchController;
