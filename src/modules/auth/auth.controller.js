const authService = require('./auth.service');
const asyncHandler = require('../../utils/asyncHandler');
const env = require('../../config/env');

// Cookie config — HTTP-only prevents JS access (XSS protection)
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'strict',
  maxAge: env.jwt.refreshExpiresDays * 24 * 60 * 60 * 1000, // ms
};

/**
 * POST /api/v1/auth/register
 * Creates a new organization + ADMIN user.
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({
    status: 201,
    message: 'Organization and admin account created successfully',
    data: { organization: result.org, user: result.user },
  });
});

/**
 * POST /api/v1/auth/login
 * Returns access token in body + refresh token in HTTP-only cookie.
 */
const login = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await authService.login(req.body);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
  res.status(200).json({
    status: 200,
    message: 'Login successful',
    data: { accessToken, user },
  });
});

/**
 * POST /api/v1/auth/refresh
 * Reads refresh token from cookie, rotates and returns new access token.
 */
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  const { accessToken, refreshToken } = await authService.refresh(token);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
  res.status(200).json({
    status: 200,
    message: 'Token refreshed',
    data: { accessToken },
  });
});

/**
 * POST /api/v1/auth/logout
 * Revokes refresh token and clears cookie.
 */
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  await authService.logout(token);

  res.clearCookie('refreshToken');
  res.status(200).json({ status: 200, message: 'Logged out successfully' });
});

module.exports = { register, login, refresh, logout };
