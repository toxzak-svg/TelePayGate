# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy all packages
COPY packages ./packages

# Install dependencies and build
RUN npm install
RUN npm run build --workspaces

# Runtime stage
FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache postgresql-client

# Copy only what's needed from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Copy .env
COPY .env.example .env

EXPOSE 3000

CMD ["node", "packages/api/dist/server.js"]
