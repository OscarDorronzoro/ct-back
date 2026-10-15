import searchService from '../services/searchService';

function searchController() {
  async function get(req, res, next) {
    try {
      const results = await searchService.search(req.validated.query.q);

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
