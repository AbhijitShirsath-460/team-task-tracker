const { createClient } = require('redis');
const env = require('./env');
const logger = require('../utils/logger');

// Singleton Redis client
const redisClient = createClient({ url: env.redis.url });

// Log connection events
redisClient.on('connect', () => logger.info('Redis connected'));
redisClient.on('error', (err) => logger.error('Redis error', { message: err.message }));

/**
 * Connect to Redis — called once at server startup
 */
const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

/**
 * Gracefully disconnect Redis — called on server shutdown
 */
const disconnectRedis = async () => {
  if (redisClient.isOpen) {
    await redisClient.disconnect();
    logger.info('Redis disconnected');
  }
};

module.exports = { redisClient, connectRedis, disconnectRedis };
