const { createLogger, format, transports } = require('winston');
const { combine, timestamp, colorize, printf, json } = format;

const isProduction = process.env.NODE_ENV === 'production';

// Custom format for development — human-readable coloured output
const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const extra = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${ts} [${level}]: ${message} ${extra}`;
});

const logger = createLogger({
  // Debug in dev, info in prod (no verbose SQL logs in production)
  level: isProduction ? 'info' : 'debug',

  transports: [
    // Console — coloured in dev, structured JSON in prod
    new transports.Console({
      format: isProduction
        ? combine(timestamp(), json())
        : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), devFormat),
    }),

    // File — errors only
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(timestamp(), json()),
    }),

    // File — everything
    new transports.File({
      filename: 'logs/combined.log',
      format: combine(timestamp(), json()),
    }),
  ],
});

// Morgan stream bridge — pipes HTTP request logs through winston
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;
