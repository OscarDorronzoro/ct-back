import searchService from '../services/searchService';
import validator from '../utils/validator';

function searchController() {
  async function get(req, res, next) {
    try {
      const query = req.query.q;

      if (!validator.isNonEmptyString(query)) {
        return res.status(400)
          .json({ error: 'q is required' });
      }

      const results = await searchService.search(query);

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
