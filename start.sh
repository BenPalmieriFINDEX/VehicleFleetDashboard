#!/bin/sh
echo "=== CONTAINER STARTUP ==="
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo YES || echo NO)"

echo "=== Pushing database schema ==="
cd /app/server && npx prisma db push --accept-data-loss

echo "=== Seeding database (skips if already seeded) ==="
cd /app/server && node prisma/seed.js

echo "=== Starting server ==="
exec node /app/server/index.js
