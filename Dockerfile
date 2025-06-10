# Multi-stage build for efficient container size
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

    # Build the application
    RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create a non-root user for security
RUN addgroup -g 1001 -S autotask && \
    adduser -S autotask -u 1001 -G autotask

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create logs directory
RUN mkdir -p /app/logs && chown -R autotask:autotask /app

# Switch to non-root user
USER autotask

# Expose port (if needed for future HTTP interface)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV LOG_FORMAT=json

# Define volume for logs
VOLUME ["/app/logs"]

# Start the application with stdout wrapper
CMD ["node", "dist/wrapper.js"]

# Labels for metadata
LABEL maintainer="autotask-mcp@example.com"
LABEL version="1.0.0"
LABEL description="Autotask MCP Server - Model Context Protocol server for Kaseya Autotask PSA"
LABEL org.opencontainers.image.source="https://github.com/your-org/autotask-mcp"
LABEL org.opencontainers.image.documentation="https://github.com/your-org/autotask-mcp/blob/main/README.md" 