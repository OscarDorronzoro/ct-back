import './config/env';
import express from 'express';
import cors from 'cors';
import http from 'http';
import https from 'https';
import fs from 'fs';
import cron from 'node-cron';

import routes from './routes';
import processPendingMessages from './jobs/processRawRfJob';
import logger from './utils/logger';

// Constant definition
const API_PORT = Number(process.env.PORT) || 3000;
const API_HOST = process.env.HOST || 'localhost';
const API_BASE_URL = '/api';

const { TLS_CRT } = process.env;
const { TLS_KEY } = process.env;

// Express
const app = express();

app.use(express.json({ limit: '10mb', extended: true }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS
const corsOptions = {
  origin: [
    // Dev
    'http://localhost:5173',
    'https://localhost:5173',
    'http://192.168.1.41:5173',
    'https://192.168.1.41:5173',
    'http://dev.rastreo.vacas.inet:5173',
    'https://dev.rastreo.vacas.inet:5173',

    // Prod
    'http://localhost',
    'https://localhost',
    'http://192.168.1.159',
    'https://192.168.1.159',
    'http://rastreo.vacas.inet',
    'https://rastreo.vacas.inet',
  ],
};
app.use(cors(corsOptions));

// Routes
app.use(API_BASE_URL, routes);

// Serve app (HTTP)
const httpServer = http.createServer(app);

httpServer.listen(API_PORT + 1, API_HOST, () => {
  logger.info(`Backend http listening on port ${API_PORT + 1}, host ${API_HOST}`);
});

// Serve app (HTTPS)
let httpsServer = null;
try {
  // Read tls certificate
  const key = fs.readFileSync(TLS_KEY, 'utf8');
  const cert = fs.readFileSync(TLS_CRT, 'utf8');

  httpsServer = https.createServer({ key, cert }, app);

  httpsServer.listen(API_PORT, API_HOST, () => {
    logger.info(`Backend https listening on port ${API_PORT}, host ${API_HOST}`);
  });
} catch (err) {
  logger.warn(err, 'HTTPS server cannot be started');
}

// Jobs
let running = false;
cron.schedule('*/5 * * * * *', async () => {
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

export default app;
