# ==============================================================================
# Kinetix Backend API & Event Listener Worker Dockerfile
# ==============================================================================

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 1. Dependencies stage
FROM base AS deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci

# 2. Production Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy node_modules from deps
COPY --from=deps /app/backend/node_modules ./node_modules
COPY package.json ./package.json

# Copy source code and shared domain types/abis
COPY shared/ ./shared/
COPY backend/ ./backend/
COPY docker/pg-proxy.cjs ./docker/pg-proxy.cjs

WORKDIR /app

USER node

EXPOSE 4000

# Default command: run Express API Server.
# Can be overridden by docker-compose for the blockchain event listener daemon.
CMD ["./node_modules/.bin/tsx", "backend/src/server.ts"]
