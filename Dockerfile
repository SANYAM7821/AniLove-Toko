# --- Stage 1: Build & Dependency Preparation ---
FROM node:22-slim AS builder

WORKDIR /app

# Copy root package files and install ALL dependencies
COPY package*.json ./
RUN npm install

# Copy the entire project and build the bundle
COPY . .
RUN npm run build

# Remove devDependencies and install only production for root
RUN npm prune --production

# Prepare API production dependencies
WORKDIR /app/api
COPY api/package*.json ./
RUN npm install --omit=dev


# --- Stage 2: Final Production Image ---
FROM node:22-slim

# Install Chromium and minimal system libraries
RUN apt-get update && apt-get install -y \
    chromium \
    xvfb \
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
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only the necessary production files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/api/package.json ./api/
COPY --from=builder /app/api/node_modules ./api/node_modules
COPY --from=builder /app/api/src ./api/src

# Set Environment Variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_PATH=/usr/bin/chromium \
    CF_BYPASS_HEADLESS=true \
    PORT=8099 \
    NODE_ENV=production

EXPOSE 8099

# Start with a direct node command
CMD ["node", "api/src/server.js"]
