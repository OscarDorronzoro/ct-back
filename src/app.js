import express from 'express';
import cookieParser from 'cookie-parser';

import routes from './routes';
import errorHandler from './shared/middleware/errorHandler.middleware';

const API_BASE_URL = '/api';

// The Express app: middleware, routes and errors. Listening and the jobs are in server.js, so the
// integration tests can use the app without them.
export default function createApp() {
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

  return app;
}
