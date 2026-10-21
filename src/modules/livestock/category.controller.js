import categoryRepository from './category.repository';

function categoryController() {
  async function getAll(req, res, next) {
    try {
      const categories = await categoryRepository.findAll();

      return res.status(200)
        .json(categories);
    } catch (err) {
      return next(err);
    }
  }

  return { getAll };
}

export default categoryController;
