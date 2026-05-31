const { PrismaClient } = require('@prisma/client');

// Singleton — one Prisma instance reused across the entire app
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});

module.exports = prisma;
