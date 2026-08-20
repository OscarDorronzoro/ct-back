import crypto from 'crypto';
import logger from '../utils/logger';
import gatewayRepository from '../repositories/gatewayRepository';

export default async function gatewayAuth(req, res, next) {
  // const ipOri = req.headers['x-forwarded-for'];
  // const ipProxy = req.socket.remoteAddress;
  const { ip } = req;

  const apiKey = req.header('X-API-Key');

  if (!apiKey) {
    logger.warn(`[${ip}] Invalid auth. No API_KEY`);
    return res.sendStatus(401);
  }

  try {
    const apiKeyHash = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');
    const gateway = await gatewayRepository.findByApiKeyHash(apiKeyHash);

    if (!gateway) {
      logger.warn('Gateway not found');
      // return res.sendStatus(401);
    }
    req.gateway = gateway;

    if (apiKey !== process.env.API_KEY) {
      logger.warn(`[${ip}] Invalid auth. API_KEY incorrect`);
      return res.sendStatus(401);
    }

    logger.info(`[${ip}] API KEY is correct. Gateway ${gateway?.id}`);

    return next();
  } catch (err) {
    logger.error(err);
    return res.status(500)
      .json({ error: 'Internal server error' });
  }
}
