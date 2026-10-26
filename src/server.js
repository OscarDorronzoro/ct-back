import http from 'http';

import logger from './shared/utils/logger';
import createApp from './app';

import startProcessPendingMessagesJob from './modules/telemetry/processPendingMessages.job';
import startImageCleanupJob from './modules/livestock/imageCleanup.job';
import startSessionCleanupJob from './modules/identity/sessionCleanup.job';
import startFirmwareCleanupJob from './modules/devices/firmwareCleanup.job';
import startWeatherSyncJob from './modules/environment/weatherSync.job';
import startNdviSyncJob from './modules/environment/ndviSync.job';
import startCategoryRulesJob from './modules/livestock/categoryRules.job';
import startDwRefreshJob from './modules/analytics/dwRefresh.job';
import startDeliverNotificationsJob from './modules/notifications/deliverNotifications.job';

const API_PORT = Number(process.env.PORT) || 3000;
const API_HOST = process.env.HOST || 'localhost';

// Serve app (HTTP)
const httpServer = http.createServer(createApp());

httpServer.listen(API_PORT, API_HOST, () => {
  logger.info(`Backend http listening on port ${API_PORT}, host ${API_HOST}`);
});

const JOBS = {
  processPendingMessages: startProcessPendingMessagesJob,
  imageCleanup: startImageCleanupJob,
  sessionCleanup: startSessionCleanupJob,
  firmwareCleanup: startFirmwareCleanupJob,
  weatherSync: startWeatherSyncJob,
  ndviSync: startNdviSyncJob,
  categoryRules: startCategoryRulesJob,
  dwRefresh: startDwRefreshJob,
  deliverNotifications: startDeliverNotificationsJob,
};

// All of them, or the ones in JOBS (comma separated names): the e2e tests of the frontend start
// only the ones they use (weather and NDVI call external services)
const enabled = process.env.JOBS?.split(',').map((name) => name.trim()) ?? Object.keys(JOBS);

enabled.forEach((name) => {
  if (!JOBS[name]) {
    throw new Error(`Unknown job in JOBS: ${name}`);
  }
  JOBS[name]();
});
