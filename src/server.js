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

// Jobs
startProcessPendingMessagesJob();
startImageCleanupJob();
startSessionCleanupJob();
startFirmwareCleanupJob();
startWeatherSyncJob();
startNdviSyncJob();
startCategoryRulesJob();
startDwRefreshJob();
startDeliverNotificationsJob();
