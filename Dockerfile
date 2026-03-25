FROM node:20

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install server dependencies
COPY server/package.json ./server/
RUN cd server && npm install

# Build React frontend
COPY client/package.json ./client/
RUN cd client && npm install
COPY client ./client/
RUN cd client && npm run build

# Copy full server source, then generate Prisma client
COPY server ./server/
RUN cd server && npx prisma generate

COPY start.sh ./start.sh
RUN chmod +x start.sh

EXPOSE 3001

ENV NODE_ENV=production
CMD ["sh", "start.sh"]
