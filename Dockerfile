# Hearth Dockerfile - Multi-stage build for production optimization

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl python3 make g++
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
# Copy entire prisma directory (including migrations if they exist in build context)
COPY prisma ./prisma/
COPY prisma.config.* ./

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

# Accept build arguments for version info
ARG NEXT_PUBLIC_BUILD_VERSION
ARG NEXT_PUBLIC_BUILD_DATE

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
# Explicitly copy prisma directory including migrations
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/prisma.config.* ./

# Verify migrations are present
RUN if [ ! -d "/app/prisma/migrations" ] || [ -z "$(ls -A /app/prisma/migrations 2>/dev/null)" ]; then \
      echo "⚠️  WARNING: Migrations directory is missing or empty!"; \
      ls -la /app/prisma/ || true; \
    else \
      echo "✅ Migrations directory found with $(ls -1 /app/prisma/migrations | wc -l) migration(s)"; \
    fi

# Copy application code
COPY . .

# Copy generated Prisma Client from deps stage
COPY --from=deps /app/app/generated ./app/generated

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Increase Node.js memory limit for large builds
ENV NODE_OPTIONS="--max-old-space-size=4096"
# Pass version info to Next.js build (must be set as ENV for Next.js to embed them)
ENV NEXT_PUBLIC_BUILD_VERSION=$NEXT_PUBLIC_BUILD_VERSION
ENV NEXT_PUBLIC_BUILD_DATE=$NEXT_PUBLIC_BUILD_DATE

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
# Explicitly copy prisma directory including migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.* ./

# Verify migrations are present in final image
RUN if [ ! -d "/app/prisma/migrations" ] || [ -z "$(ls -A /app/prisma/migrations 2>/dev/null)" ]; then \
      echo "❌ ERROR: Migrations directory is missing or empty in final image!"; \
      echo "Contents of /app/prisma:"; \
      ls -la /app/prisma/ || true; \
      exit 1; \
    else \
      echo "✅ Migrations verified: $(ls -1 /app/prisma/migrations | grep -E '^[0-9]' | wc -l) migration(s) found"; \
    fi

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
