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

# Install dependencies
RUN --mount=type=cache,target=/root/.npm,id=npm-cache \
    npm install --workspaces --ignore-scripts --no-audit --no-fund

# Copy source code and database migrations
COPY packages ./packages
COPY database ./database

# Build all workspace packages (core, api, sdk, dashboard)
# Use explicit workspace build commands to match monorepo scripts
RUN npm run -w telepaygate-core build && \
    npm run -w telepaygate-api build && \
    npm run -w telepaygate-sdk build && \
    npm run -w "@tg-payment/dashboard" build || true

# Prune dev dependencies to keep runtime image small
RUN npm prune --production || true

# =============================================================================
# Runtime stage - Minimal production image
# =============================================================================
FROM node:20-alpine

WORKDIR /app

# Install only required system dependencies
# Install only required system dependencies
RUN apk add --no-cache postgresql-client tini

# Install a small static file server for serving the dashboard build
RUN npm i -g serve@14.2.0 || true

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# Copy production dependencies and built code
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/
COPY --from=builder /app/packages/sdk/dist ./packages/sdk/dist
COPY --from=builder /app/packages/sdk/package.json ./packages/sdk/
COPY --from=builder /app/packages/dashboard/dist ./packages/dashboard/dist
COPY --from=builder /app/packages/dashboard/package.json ./packages/dashboard/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/database ./database

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "packages/api/dist/index.js"]
