FROM node:20-slim

# Install Chromium and required system libs for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    ca-certificates \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system Chromium, not download its own
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

# Install server dependencies and generate Prisma client
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY server/prisma ./server/prisma/
RUN cd server && npx prisma generate

# Build React frontend
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client ./client/
RUN cd client && npm run build

# Copy server source
COPY server ./server/

EXPOSE 3000

CMD ["node", "server/index.js"]
