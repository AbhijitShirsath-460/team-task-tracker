#!/bin/sh
# Exit immediately if any command fails
set -e

echo "⏳ Running Prisma migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database (idempotent — safe to re-run)..."
node prisma/seed.js

echo "🚀 Starting server..."
exec node src/server.js
