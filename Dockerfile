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

ENV NODE_ENV=production
CMD ["sh", "-c", "cd server && npx prisma db push --accept-data-loss && npx prisma db seed && cd /app && node server/index.js"]
