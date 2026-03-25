#!/bin/sh
echo "=== CONTAINER STARTUP ==="
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo YES || echo NO)"
echo "Running: node server/index.js"
exec node server/index.js
