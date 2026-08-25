import express from 'express';
import cookieParser from 'cookie-parser';
import http from 'http';
import cron from 'node-cron';

import logger from './utils/logger';
import routes from './routes';
import processPendingMessages from './jobs/processRawRfJob';
import errorHandler from './middleware/errorHandler';

// Constant definition
const API_PORT = Number(process.env.PORT) || 3000;
const API_HOST = process.env.HOST || 'localhost';
const API_BASE_URL = '/api';

// Express
const app = express();

app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb', extended: true }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

/*
 * CORS is not required anymore because the frontend and API are served
 * through the same origin in both development and production.
 *
 * Development: Vite proxies /api to the backend.
 * Production: Nginx proxies /api to the backend.
 */

// Routes
app.use(API_BASE_URL, routes);

// Error handler middleware
app.use(errorHandler);

// Serve app (HTTP)
const httpServer = http.createServer(app);

const portHttp = API_PORT;
httpServer.listen(portHttp, API_HOST, () => {
  logger.info(`Backend http listening on port ${portHttp}, host ${API_HOST}`);
});

// Jobs
let running = false;
const jobProcessMessages = cron.schedule('*/5 * * * * *', async () => {
  if (running) {
    logger.warn('Job already running');
    return;
  }

  running = true;

  try {
    await processPendingMessages();
  } finally {
    running = false;
  }
});

jobProcessMessages.on('execution:missed', (ctx) => {
  logger.warn({
    message: 'processPendingMessages execution missed',
    execution: ctx.execution,
  });
});

jobProcessMessages.on('execution:failed', (ctx) => {
  logger.error({
    message: 'processPendingMessages an error ocurred',
    execution: ctx.execution,
  });
});

export default app;
