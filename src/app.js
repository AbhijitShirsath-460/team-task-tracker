const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');

const logger           = require('./utils/logger');
const { errorHandler } = require('./middlewares/error.middleware');
const env              = require('./config/env');

// Route modules
const authRoutes      = require('./modules/auth/auth.routes');
const userRoutes      = require('./modules/users/users.routes');
const projectRoutes   = require('./modules/projects/projects.routes');
const taskRoutes      = require('./modules/tasks/tasks.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');

const app = express();

// ── Security middlewares ───────────────────────────────────────
app.use(helmet());                                          // Security headers
app.use(cors({ origin: env.corsOrigin, credentials: true })); // CORS

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── HTTP logging (morgan → winston) ──────────────────────────
app.use(morgan('combined', { stream: logger.stream }));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 200, message: 'API is running' });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/v1/auth',      authRoutes);
app.use('/api/v1/users',     userRoutes);
app.use('/api/v1/projects',  projectRoutes);
app.use('/api/v1/tasks',     taskRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// ── Swagger Docs ──────────────────────────────────────────────
try {
  const { swaggerUi, swaggerSpec } = require('../docs/swagger');
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  logger.info('Swagger UI available at /api/docs');
} catch {
  logger.warn('Swagger docs not available');
}

// ── 404 catch-all ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: 404, code: 'NOT_FOUND', message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler (must be last) ───────────────────────
app.use(errorHandler);

module.exports = app;
