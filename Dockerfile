FROM node:20-slim

# Install Chromium (apt handles all its own dependencies)
RUN apt-get update && apt-get install -y \
    chromium \
    openssl \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use system Chromium instead of downloading its own
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install server dependencies and generate Prisma client
COPY server/package.json ./server/
RUN cd server && npm install
COPY server/prisma ./server/prisma/
RUN cd server && npx prisma generate

# Build React frontend
COPY client/package.json ./client/
RUN cd client && npm install
COPY client ./client/
RUN cd client && npm run build

# Copy server source
COPY server ./server/

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENV NODE_ENV=production
CMD ["sh", "-c", "cd server && npx prisma migrate deploy && npx prisma db seed; cd /app && node server/index.js"]
