FROM node:20-slim

RUN apt-get update && apt-get install -y \
    chromium \
    openssl \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install server dependencies
COPY server/package.json ./server/
RUN cd server && npm install

# Build React frontend
COPY client/package.json ./client/
RUN cd client && npm install
COPY client ./client/
RUN cd client && npm run build

# Copy full server source (including prisma schema), then generate Prisma client
COPY server ./server/
RUN cd server && npx prisma generate

EXPOSE 3001

ENV NODE_ENV=production
CMD ["node", "server/index.js"]
