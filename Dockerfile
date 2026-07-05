# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:20-alpine AS frontend-build

WORKDIR /app/client

COPY client/package.json client/package-lock.json* ./
RUN npm ci

COPY client/ ./
COPY shared/ /app/shared/

RUN npm run build

# ============================================
# Stage 2: Build Backend
# ============================================
FROM node:20-alpine AS backend-build

WORKDIR /app/server

COPY server/package.json server/package-lock.json* ./
RUN npm ci

COPY server/ ./
COPY shared/ /app/server/shared/

RUN npm run build

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --only=production && npm cache clean --force

# Copy built backend
COPY --from=backend-build /app/server/dist ./server/dist
COPY --from=backend-build /app/server/shared ./server/shared

# Copy built frontend into server's public directory
COPY --from=frontend-build /app/client/dist ./public

# Install serve for static file fallback (not needed if Express serves it)
# We'll configure Express to serve the frontend

# Expose port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:10000/api/health || exit 1

# Start the server
CMD ["node", "server/dist/index.js"]