import cowRepository from '../livestock/cow.repository';
import collarRepository from '../devices/collar.repository';

const searchService = {
  // Each kind of result only for who can read it
  async search(query, permissions) {
    const [cows, collars] = await Promise.all([
      permissions.includes('cows:read') ? cowRepository.search(query) : [],
      permissions.includes('collars:read') ? collarRepository.search(query) : [],
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
