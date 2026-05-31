FROM node:18-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./

# Install ALL deps — prisma CLI is in dependencies (not devDeps) intentionally
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client based on schema
RUN npx prisma generate

# Copy and permission the entrypoint script
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

# Entrypoint runs migrations → seed → server
ENTRYPOINT ["/entrypoint.sh"]
