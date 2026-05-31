const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi    = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Team Task Tracker API',
      version: '1.0.0',
      description: `
REST API for team-based task tracking with JWT auth, RBAC, Redis caching, and Docker.

## Authentication
Use Bearer token in the Authorization header:
\`Authorization: Bearer <access_token>\`

## Roles
- **ADMIN** — Full access: manage users, projects, tasks
- **MANAGER** — Manage projects and tasks; cannot manage users
- **MEMBER** — View and update only tasks assigned to them

## Default Credentials (seeded)
| Role | Email | Password |
|---|---|---|
| ADMIN | admin@democorp.com | Admin@1234 |
| MANAGER | manager@democorp.com | Manager@1234 |
| MEMBER | member@democorp.com | Member@1234 |
      `,
    },
    servers: [{ url: '/api/v1', description: 'API v1' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status:  { type: 'integer', example: 400 },
            code:    { type: 'string',  example: 'VALIDATION_ERROR' },
            message: { type: 'string',  example: 'due_date must be a future date' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id:          { type: 'string', format: 'uuid' },
            title:       { type: 'string' },
            description: { type: 'string' },
            priority:    { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            status:      { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] },
            assigneeId:  { type: 'string', format: 'uuid' },
            dueDate:     { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
            createdAt:   { type: 'string', format: 'date-time' },
            updatedAt:   { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // Scan all route files for @swagger JSDoc comments
  apis: ['./src/modules/**/*.routes.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };
