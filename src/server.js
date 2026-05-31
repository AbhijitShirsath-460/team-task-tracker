// Load env first — crashes early if required vars are missing
require('./config/env');

const app                            = require('./app');
const { connectRedis, disconnectRedis } = require('./config/redis');
const prisma                         = require('./config/db');
const logger                         = require('./utils/logger');
const env                            = require('./config/env');

const PORT = env.port;

const startServer = async () => {
  try {
    // Connect to Redis
    await connectRedis();

    // Verify PostgreSQL connection
    await prisma.$connect();
    logger.info('PostgreSQL connected');

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, { env: env.nodeEnv });
      logger.info(`API docs: http://localhost:${PORT}/api/docs`);
      logger.info(`Health:   http://localhost:${PORT}/health`);
    });

    // ── Graceful shutdown ─────────────────────────────────────
    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        await disconnectRedis();
        logger.info('Server shut down cleanly');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Failed to start server', { message: err.message, stack: err.stack });
    process.exit(1);
  }
};

startServer();
