import { eq, and, isNull } from 'drizzle-orm';

import db from '../db/drizzle';
import gateways from '../schema/gateways';

const gatewayRepository = {

  async findByApiKeyHash(apiKeyHash, tx = db) {
    const [gateway] = await tx
      .select({
        id: gateways.id,
        description: gateways.description,
      })
      .from(gateways)
      .where(and(
        eq(gateways.apiKeyHash, apiKeyHash),
        isNull(gateways.revokedAt),
      ));

    return gateway ?? null;
  },

};

export default gatewayRepository;
