import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

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

  transports: [
    // Cosole
    new winston.transports.Console(),

    // File. Combine all log levels
    new DailyRotateFile({
      filename: '/var/log/cattle_tracker/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    }),

    // File. Only error log levels
    new DailyRotateFile({
      filename: '/var/log/cattle_tracker/error-%DATE%.log',
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d',
    }),

    // File. Only warn log levels
    new DailyRotateFile({
      filename: '/var/log/cattle_tracker/warn-%DATE%.log',
      level: 'warn',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d',
    }),

    // File. Only info log levels
    new DailyRotateFile({
      filename: '/var/log/cattle_tracker/info-%DATE%.log',
      level: 'info',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    }),

    // File. Only debug log levels
    new DailyRotateFile({
      filename: '/var/log/cattle_tracker/debug-%DATE%.log',
      level: 'debug',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '5d',
    }),
  ],

  exceptionHandlers: [
    new DailyRotateFile({
      filename: '/var/log/cattle_tracker/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
    }),
  ],

  rejectionHandlers: [
    new DailyRotateFile({
      filename: '/var/log/cattle_tracker/rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
    }),
  ],
});

export default logger;
