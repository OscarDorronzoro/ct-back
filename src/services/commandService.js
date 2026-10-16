import db from '../db/drizzle';
import commandRepository from '../repositories/commandRepository';
import collarRepository from '../repositories/collarRepository';
import firmwareRepository from '../repositories/firmwareRepository';
import zoneRepository from '../repositories/zoneRepository';

import AppError from '../errors/AppError';
import { FACTORY_PARAMS } from '../utils/collarParams';
import haversine from '../utils/positionHelper';

const SUCCESS_RESULTS = ['ok', 'duplicate'];

// A zone that fits in the collar
const ZONE_MIN_POINTS = 3;
const ZONE_MAX_POINTS = 16;
// The collar stores vertices as offsets from the first one
const ZONE_MAX_RADIUS_M = 36000;

// The gateway queue holds 16 frames in total (a zone takes 5)
const MAX_COMMANDS_PER_RESPONSE = 4;
// The gateway retries for up to ~1 h (10 collar transmissions). Without a result after this,
// the gateway probably lost its queue (reboot): deliver again, it ignores ids already queued.
const REDELIVER_AFTER_MS = 2 * 60 * 60 * 1000;

function invalid(message) {
  return new AppError('INVALID_COMMAND', 400, message);
}

// The zone must fit in the collar (vertex count, distance from the first vertex)
async function buildZonePayload({ zone, zoneId }) {
  const zoneEntity = await zoneRepository.findById(zoneId);

  if (!zoneEntity) {
    throw new AppError('ZONE_NOT_FOUND', 404);
  }

  const { points } = zoneEntity;

  if (points.length < ZONE_MIN_POINTS || points.length > ZONE_MAX_POINTS) {
    throw invalid(`a collar zone must have ${ZONE_MIN_POINTS}..${ZONE_MAX_POINTS} vertices (has ${points.length})`);
  }

  const [first] = points;
  const toPosition = ([latitude, longitude]) => ({ location: { latitude, longitude } });

  const tooFar = points.some(
    (point) => haversine(toPosition(first), toPosition(point)) > ZONE_MAX_RADIUS_M,
  );

  if (tooFar) {
    throw invalid(`every vertex must be within ${ZONE_MAX_RADIUS_M / 1000} km of the first one`);
  }

  // Snapshot: the zone can be edited later, the command keeps what was sent
  return { zone, zoneId: zoneEntity.id, points };
}

// Without version: the latest firmware
async function buildOtaPayload({ version }) {
  const firmware = version
    ? await firmwareRepository.findByVersion(version)
    : await firmwareRepository.findLatest();

  if (!firmware) {
    throw new AppError('FIRMWARE_NOT_FOUND', 404);
  }

  return {
    firmwareId: firmware.id,
    code: firmware.code,
    version: firmware.version,
    size: firmware.size,
    md5: firmware.md5,
    sha256: firmware.sha256,
  };
}

async function buildPayload(type, body) {
  switch (type) {
    case 'params':
      return { params: body.params };

    case 'zone':
      return buildZonePayload(body);

    case 'zoneClear':
      return { zone: body.zone };

    case 'ota':
      return buildOtaPayload(body);

    default:
      return null;
  }
}

// Command as the gateway expects it. id: command target id, used to report the result.
function toGatewayCommand(target, collar) {
  const { payload } = target;
  const command = {
    id: target.id,
    collar: collar.code,
    type: target.type,
  };

  switch (target.type) {
    case 'params':
      return { ...command, params: payload.params };

    case 'zone':
      return { ...command, zone: payload.zone, points: payload.points };

    case 'zoneClear':
      return { ...command, zone: payload.zone };

    case 'ota':
      return {
        ...command,
        version: payload.code,
        size: payload.size,
        md5: payload.md5,
        sha256: payload.sha256,
      };

    // The collar has no code yet: the gateway addresses it by mac
    case 'assignCode':
      return {
        ...command,
        collar: 0,
        mac: payload.mac,
        code: payload.code,
      };

    default:
      return command;
  }
}

const commandService = {

  // body validated by commandValidator: { type, target, ...fields of the type }
  async create(body, userId) {
    const { type, target } = body;
    const collarIds = target === 'all' ? null : target.collarIds;

    const payload = await buildPayload(type, body);

    return db.transaction(async (tx) => {
      let collarList;

      if (collarIds) {
        collarList = await collarRepository.findByIds(collarIds, tx);

        if (collarList.length !== collarIds.length) {
          throw new AppError('COLLAR_NOT_FOUND', 404);
        }
      } else {
        collarList = await collarRepository.findAll({}, tx);

        if (collarList.length === 0) {
          throw new AppError('COLLAR_NOT_FOUND', 404);
        }
      }

      const command = await commandRepository.create({
        type,
        payload,
        target: collarIds ? 'collars' : 'all',
        createdBy: userId,
      }, tx);

      const targets = await commandRepository.createTargets(
        collarList.map((collar) => ({
          commandId: command.id,
          collarId: collar.id,
        })),
        tx,
      );

      return { ...command, targets };
    });
  },

  // Sent to a collar that joined: the code it must use from now on. The collar repeats join
  // until it gets it, so an open command with the same code and mac is not created again.
  async createAssignCode(collar, tx = db) {
    const open = await commandRepository.findOpenTarget(collar.id, 'assignCode', tx);

    if (open && open.payload.code === collar.code && open.payload.mac === collar.mac) {
      return;
    }

    // Outdated (code or mac edited since): if already delivered, the gateway drops it
    // through the cancel list
    if (open) {
      await commandRepository.cancel(open.commandId, tx);
    }

    const command = await commandRepository.create({
      type: 'assignCode',
      payload: { mac: collar.mac, code: collar.code },
      target: 'collars',
      createdBy: null,
    }, tx);

    await commandRepository.createTargets([{
      commandId: command.id,
      collarId: collar.id,
    }], tx);
  },

  async get(id) {
    const command = await commandRepository.findById(id);

    if (!command) {
      return null;
    }

    const targets = await commandRepository.findTargetsByCommand(id);

    return { ...command, targets };
  },

  async getAll(options) {
    return commandRepository.findAll(options);
  },

  async cancel(id) {
    return db.transaction(async (tx) => {
      const command = await commandRepository.findById(id, tx);

      if (!command) {
        throw new AppError('COMMAND_NOT_FOUND', 404);
      }

      const targets = await commandRepository.findTargetsByCommand(id, tx);

      if (command.canceledAt || targets.every((t) => t.status === 'done')) {
        throw new AppError('COMMAND_FINISHED', 409);
      }

      await commandRepository.cancel(id, tx);

      return {
        ...await commandRepository.findById(id, tx),
        targets: await commandRepository.findTargetsByCommand(id, tx),
      };
    });
  },

  // Downlink for the response to POST /api/rf.
  // commands: pending commands of the collar that just transmitted.
  // cancel: ids queued in this gateway whose command was canceled.
  async getForGateway(collar, gatewayId, options = {}) {
    return db.transaction(async (tx) => {
      let gatewayCommands = [];

      if (collar) {
        const targets = await commandRepository.findDeliverable(collar.id, {
          redeliverBefore: new Date(Date.now() - REDELIVER_AFTER_MS),
          limit: MAX_COMMANDS_PER_RESPONSE,
          type: options.type,
        }, tx);

        await commandRepository.markDelivered(targets.map((t) => t.id), gatewayId, tx);

        gatewayCommands = targets.map((target) => toGatewayCommand(target, collar));
      }

      const cancel = await commandRepository.findToCancel(gatewayId, tx);

      return { commands: gatewayCommands, cancel };
    });
  },

  // results: [{ id, result }] reported by a gateway, validated by commandValidator.
  // Unknown or finished ids are ignored; a repeated id keeps its first result.
  async reportResults(results) {
    const resultById = new Map();
    results.forEach(({ id, result }) => {
      if (!resultById.has(id)) {
        resultById.set(id, result);
      }
    });

    return db.transaction(async (tx) => {
      // One update per distinct result
      const idsByResult = new Map();
      resultById.forEach((result, id) => {
        idsByResult.set(result, [...(idsByResult.get(result) ?? []), id]);
      });

      const completedLists = await Promise.all([...idsByResult].map(
        ([result, ids]) => commandRepository.completeTargets(ids, result, tx),
      ));
      const completedIds = new Set(completedLists.flat().map((t) => t.id));

      // Accepted params changes: merged into each collar's params, in the reported order
      const targets = await commandRepository.findTargetsByIds([...completedIds], tx);
      const targetById = new Map(targets.map((t) => [t.id, t]));
      const paramChanges = [...resultById]
        .filter(([id, result]) => completedIds.has(id) && SUCCESS_RESULTS.includes(result))
        .map(([id]) => targetById.get(id))
        .filter((t) => t.type === 'params' || t.type === 'resetParams');

      const collarList = await collarRepository.findByIds(
        [...new Set(paramChanges.map((t) => t.collarId))],
        tx,
      );
      const paramsByCollar = new Map(collarList.map((c) => [c.id, c.params]));

      paramChanges.forEach((target) => {
        if (!paramsByCollar.has(target.collarId)) {
          return;
        }

        paramsByCollar.set(target.collarId, target.type === 'params'
          ? { ...FACTORY_PARAMS, ...paramsByCollar.get(target.collarId), ...target.payload.params }
          : { ...FACTORY_PARAMS });
      });

      await Promise.all([...paramsByCollar].map(([collarId, params]) => (
        collarRepository.update(collarId, { params, updatedAt: new Date() }, tx)
      )));

      return { updated: completedIds.size };
    });
  },

};

export default commandService;
