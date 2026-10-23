import healthService from './health.service';

function healthController() {
  async function getCowHealth(req, res, next) {
    try {
      const health = await healthService.getCowHealth(req.validated.params.cowId);

      return res.status(200).json(health);
    } catch (err) {
      return next(err);
    }
  }

  async function postEvent(req, res, next) {
    try {
      const event = await healthService.recordEvent(
        req.validated.params.cowId,
        req.validated.body,
        req.user.sub,
      );

      return res.status(201).json({ event });
    } catch (err) {
      return next(err);
    }
  }

  async function voidEvent(req, res, next) {
    try {
      const event = await healthService.voidEvent(
        req.validated.params.eventId,
        req.validated.body.reason,
        req.user.sub,
      );

      return res.status(200).json({ event });
    } catch (err) {
      return next(err);
    }
  }

  async function getProducts(req, res, next) {
    try {
      const products = await healthService.getProducts(req.validated.query);

      return res.status(200).json(products);
    } catch (err) {
      return next(err);
    }
  }

  async function getProduct(req, res, next) {
    try {
      const product = await healthService.getProduct(req.validated.params.productId);

      return res.status(200).json(product);
    } catch (err) {
      return next(err);
    }
  }

  async function postProduct(req, res, next) {
    try {
      const product = await healthService.createProduct(req.validated.body);

      return res.status(201).json({ product });
    } catch (err) {
      return next(err);
    }
  }

  async function putProduct(req, res, next) {
    try {
      const product = await healthService.updateProduct(
        req.validated.params.productId,
        req.validated.body,
      );

      return res.status(200).json({ product });
    } catch (err) {
      return next(err);
    }
  }

  return {
    getCowHealth, postEvent, voidEvent, getProducts, getProduct, postProduct, putProduct,
  };
}

export default healthController;
