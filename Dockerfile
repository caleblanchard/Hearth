# Hearth Dockerfile - Multi-stage build for production optimization

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl python3 make g++
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies with QEMU workarounds
# - Increase Node.js memory limit for ARM64 builds
# - Skip optional dependencies that may cause issues under QEMU
# - Disable postinstall scripts that might fail under emulation
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV npm_config_optional=false
RUN npm ci --legacy-peer-deps --no-audit --prefer-offline || npm ci --legacy-peer-deps --no-audit

# Generate Prisma Client
RUN npx prisma generate

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/prisma ./prisma

# Copy application code
COPY . .

# Copy generated Prisma Client from deps stage
COPY --from=deps /app/app/generated ./app/generated

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime dependencies including build tools for native modules
RUN apk add --no-cache libc6-compat openssl python3 make g++

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/app/generated ./app/generated

# Copy node_modules from deps stage to ensure native modules are available
# Standalone mode doesn't always properly bundle native modules like bcrypt
COPY --from=deps /app/node_modules ./node_modules

# Rebuild native modules for Alpine Linux (musl libc)
RUN npm rebuild bcrypt --build-from-source

# Create uploads directory
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy and setup entrypoint script for auto-migrations (must be done as root)
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
