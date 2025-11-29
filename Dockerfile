# =============================================================================
# Multi-stage Dockerfile - Optimized for Speed and Size
# =============================================================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy workspace packages
COPY packages/core/package*.json ./packages/core/
COPY packages/api/package*.json ./packages/api/
COPY packages/sdk/package*.json ./packages/sdk/

# Install dependencies (with cache mount for faster builds)
RUN --mount=type=cache,target=/root/.npm \
    # Install full workspace deps (including devDependencies) so build tools
    # (TypeScript, ts-node, ts-jest, etc.) and workspace lifecycle scripts run
    # correctly during the build stage. We will prune dev deps later in the
    # multi-stage build to keep the runtime image small.
    npm ci --no-audit --prefer-offline --progress=false

# Copy source code and database migrations
COPY packages ./packages
COPY database ./database

# Build all packages
RUN npm run build:backend

# Prune dev dependencies
RUN npm prune --production

# =============================================================================
# Runtime stage - Minimal production image
# =============================================================================
FROM node:20-alpine

WORKDIR /app

# Install only required system dependencies
RUN apk add --no-cache postgresql-client tini

# Copy production dependencies and built code
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/database ./database

# Copy container helper scripts and make them executable
COPY scripts ./scripts
RUN chmod +x ./scripts/*.sh || true

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Use tini for proper signal handling and run entrypoint that waits for dependent services
ENTRYPOINT ["/sbin/tini", "--", "/app/scripts/docker-entrypoint.sh"]

CMD ["node", "packages/api/dist/index.js"]
