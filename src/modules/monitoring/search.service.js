import cowRepository from '../livestock/cow.repository';
import collarRepository from '../devices/collar.repository';

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
        // code: LoRa id shown everywhere in the app (null until the collar joins)
        label: `Collar ${collar.code ?? `#${collar.id}`}`,
        description: collar.description || null,
      })),
    ];
  },
};

export default searchService;
