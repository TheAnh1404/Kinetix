# ==============================================================================
# Kinetix Backend API & Event Listener Worker Dockerfile
# ==============================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 1. Dependencies stage
FROM base AS deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci || npm install

# 2. Production Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy node_modules from deps
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/backend/package.json ./backend/package.json

# Copy source code and shared domain types/abis
COPY shared/ ./shared/
COPY backend/ ./backend/

WORKDIR /app/backend

EXPOSE 4000

# Default command: run Express API Server.
# Can be overridden by docker-compose for the blockchain event listener daemon.
CMD ["npx", "tsx", "src/server.ts"]
