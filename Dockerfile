# Use Node 22 slim as the base for building and running
FROM node:22-slim AS builder

# Set working directory
WORKDIR /app

# Copy root package files and install ALL dependencies (including devDeps for build)
COPY package*.json ./
RUN npm install

# Copy the entire project for the build step
COPY . .

# Build the project (generates dist/bundle.js)
RUN npm run build

# Final Stage
FROM node:22-slim

# Install Chromium and necessary system libraries for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxshmfence1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Environment Variables for Puppeteer and the API
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_PATH=/usr/bin/chromium \
    CF_BYPASS_HEADLESS=true \
    PORT=8099 \
    NODE_ENV=production

WORKDIR /app

# Copy root package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy API package files and install its dependencies
COPY api/package*.json ./api/
RUN cd api && npm install --omit=dev

# Copy the built bundle from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the API source code
COPY api/src ./api/src

# Expose the API port
EXPOSE 8099

# Start the server
# The server looks for ../../dist/bundle.js relative to api/src/server.js,
# which correctly resolves to /app/dist/bundle.js
CMD ["node", "api/src/server.js"]
