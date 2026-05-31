const { redisClient } = require('../config/redis');
const env = require('../config/env');
const logger = require('./logger');

/**
 * Build a deterministic cache key for task list queries.
 * Unknown/unfiltered values default to "all".
 */
const buildCacheKey = (orgId, params = {}) => {
  const { assigneeId = 'all', page = 1, limit = 10, status = 'all', priority = 'all' } = params;
  return `tasks:org:${orgId}:assignee:${assigneeId}:page:${page}:limit:${limit}:status:${status}:priority:${priority}`;
};

/**
 * Get a cached value by key.
 * Returns parsed JSON or null on miss.
 */
const getCache = async (key) => {
  try {
    const data = await redisClient.get(key);
    if (data) {
      logger.info('Cache HIT', { key });
      return JSON.parse(data);
    }
    logger.info('Cache MISS', { key });
    return null;
  } catch (err) {
    // Cache errors should not break the request — log and continue
    logger.error('Redis GET error', { key, message: err.message });
    return null;
  }
};

/**
 * Store a value in cache with TTL.
 * Also registers the key in user's tracking Set for invalidation.
 */
const setCache = async (key, data, assigneeId) => {
  try {
    await redisClient.setEx(key, env.cache.ttl, JSON.stringify(data));

    // Track this key under the assignee's set (for bulk invalidation later)
    if (assigneeId) {
      await redisClient.sAdd(`user:cachekeys:${assigneeId}`, key);
    }
  } catch (err) {
    logger.error('Redis SET error', { key, message: err.message });
  }
};

/**
 * Invalidate all cached task lists for a given assignee.
 * Reads the tracking Set, deletes all keys, then clears the Set.
 *
 * Safe: avoids SCAN/KEYS * which can block Redis in production.
 */
const invalidateUserCache = async (assigneeId) => {
  if (!assigneeId) return;

  try {
    const setKey = `user:cachekeys:${assigneeId}`;
    const keys = await redisClient.sMembers(setKey);

    if (keys.length > 0) {
      // Delete all tracked cache keys in one batch
      await redisClient.del(keys);
    }

    // Clear the tracking set itself
    await redisClient.del(setKey);

    logger.warn('Cache invalidated for assignee', { assigneeId, keysCleared: keys.length });
  } catch (err) {
    logger.error('Redis invalidation error', { assigneeId, message: err.message });
  }
};

module.exports = { buildCacheKey, getCache, setCache, invalidateUserCache };
