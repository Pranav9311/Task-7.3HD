# ============================================
# Multi-Stage Dockerfile for Deakin Learning App
# Stage 1: Build the Vite React application
# Stage 2: Serve with Nginx (lightweight)
# ============================================

# ----- Stage 1: Build -----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (Docker layer caching)
COPY package.json package-lock.json* ./

# Install dependencies (ci for reproducible builds)
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Build the production bundle
RUN npm run build

# ----- Stage 2: Production Server -----
FROM nginx:1.27-alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Expose port 80
EXPOSE 80

# Labels for versioning
ARG BUILD_VERSION=latest
ARG BUILD_DATE
LABEL version="${BUILD_VERSION}" \
      build-date="${BUILD_DATE}" \
      maintainer="deakin-student" \
      description="Deakin Learning App - React + Vite"

CMD ["nginx", "-g", "daemon off;"]
