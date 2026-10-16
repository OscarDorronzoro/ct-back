import zoneRepository from './zone.repository';
import AppError from '../../shared/errors/AppError';

function invalid(message) {
  return new AppError('INVALID_ZONE', 400, message);
}

// values come validated (zoneValidator); here, what needs the database
async function checkZone(values) {
  if (values.zoneTypeId !== undefined && !await zoneRepository.findTypeById(values.zoneTypeId)) {
    throw invalid('zoneTypeId is not valid');
  }

  if (values.points !== undefined && !await zoneRepository.isValidPolygon(values.points)) {
    throw invalid('the polygon is not valid (edges must not cross)');
  }
}

const zoneService = {

  async getAll(options) {
    return zoneRepository.findAll(options);
  },

  async get(id) {
    return zoneRepository.findById(id);
  },

  async getTypes() {
    return zoneRepository.findTypes();
  },

  async create(values) {
    await checkZone(values);

    return zoneRepository.create(values);
  },

  async update(id, values) {
    await checkZone(values);

    return zoneRepository.update(id, { ...values, updatedAt: new Date() });
  },

  async delete(id) {
    return zoneRepository.delete(id);
  },

};

export default zoneService;
