import cowRepository from '../repositories/cowRepository';
import collarRepository from '../repositories/collarRepository';

const searchService = {
  async search(query) {
    const [cows, collars] = await Promise.all([
      cowRepository.search(query),
      collarRepository.search(query),
    ]);

    return [
      ...cows.map((cow) => ({
        type: 'cow',
        id: cow.id,
        label: cow.alias || `Vaca #${cow.id}`,
        description: cow.earTag
          ? `Caravana: ${cow.earTag}`
          : null,
      })),
      ...collars.map((collar) => ({
        type: 'collar',
        id: collar.id,
        label: `Collar #${collar.id}`,
        description: collar.description || null,
      })),
    ];
  },
};

export default searchService;
