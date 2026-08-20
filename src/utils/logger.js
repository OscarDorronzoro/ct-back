import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const LOG_ROOT = process.env.LOG_ROOT || '/var/log/cattle_tracker';

const transports = [
  // Cosole
  new winston.transports.Console(),

  // File. Combine log above logger global level (LOG_LEVEL)
  new DailyRotateFile({
    filename: `${LOG_ROOT}/combined-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
  }),

  // File. Error log and above levels
  new DailyRotateFile({
    filename: `${LOG_ROOT}/error-%DATE%.log`,
    level: 'error',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '90d',
  }),

  // File. Warn log and above levels
  new DailyRotateFile({
    filename: `${LOG_ROOT}/warn-%DATE%.log`,
    level: 'warn',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '90d',
  }),

  // File. Info log and above levels
  new DailyRotateFile({
    filename: `${LOG_ROOT}/info-%DATE%.log`,
    level: 'info',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
  }),
];

if (process.env.LOG_LEVEL === 'debug') {
  transports.push(
    // File. Debug log and above levels
    new DailyRotateFile({
      filename: `${LOG_ROOT}/debug-%DATE%.log`,
      level: 'debug',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '5d',
    }),
  );
}

const logger = winston.createLogger({
  // exitOnError: true,
  level: process.env.LOG_LEVEL || 'info',

  format: winston.format.combine(
    winston.format.timestamp(),

    winston.format.errors({
      stack: true,
    }),

    winston.format.printf((info) => {
      const {
        timestamp, level, message, stack, ...meta
      } = info;

      const metaString = Object.keys(meta).length ? `${JSON.stringify(meta)}` : '';
      const stackString = stack
        ? `\n===============================================
          \n${stack}\n
          ===============================================`
        : '';

      return `[${timestamp}] - (${level.toUpperCase()}): ${message}. ${metaString}. ${stackString}`;
    }),
  ),

  transports,

  exceptionHandlers: [
    new DailyRotateFile({
      filename: `${LOG_ROOT}/exceptions-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
    }),
  ],

  rejectionHandlers: [
    new DailyRotateFile({
      filename: `${LOG_ROOT}/rejections-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
    }),
  ],
});

export default logger;
