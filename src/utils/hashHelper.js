const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Hash a plain-text password.
 * @param {string} password
 * @returns {Promise<string>} hashed password
 */
const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

/**
 * Compare plain-text password against a stored hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
const comparePassword = (password, hash) => bcrypt.compare(password, hash);

module.exports = { hashPassword, comparePassword };
