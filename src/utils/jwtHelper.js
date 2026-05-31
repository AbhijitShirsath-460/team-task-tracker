const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Sign a short-lived access token.
 * Payload: { id, role, organizationId }
 */
const signAccessToken = (payload) => {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });
};

/**
 * Sign a long-lived refresh token.
 * Payload: { id } — minimal info since it's stored in DB
 */
const signRefreshToken = (payload) => {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: `${env.jwt.refreshExpiresDays}d`,
  });
};

/**
 * Verify an access token — returns decoded payload or throws.
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwt.accessSecret);
};

/**
 * Verify a refresh token — returns decoded payload or throws.
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.jwt.refreshSecret);
};

/**
 * Calculate refresh token expiry date (for DB storage).
 */
const getRefreshTokenExpiry = () => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + env.jwt.refreshExpiresDays);
  return expiry;
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
};
