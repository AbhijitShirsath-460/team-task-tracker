// Test environment setup
// Sets NODE_ENV to test and provides helpers for DB cleanup

require('dotenv').config();

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
process.env.JWT_ACCESS_SECRET  = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

module.exports = {};
