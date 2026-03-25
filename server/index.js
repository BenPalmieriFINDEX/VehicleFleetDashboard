require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Catch any crash and log it before Railway kills the container
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  process.exit(1);
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const personalUseRoutes = require('./routes/personalUse');
const contractRoutes = require('./routes/contracts');
const usageLogRoutes = require('./routes/usageLog');
const alertRoutes = require('./routes/alerts');
const reportingRoutes = require('./routes/reporting');
const importRoutes = require('./routes/importRoutes');
const aiRoutes = require('./routes/ai');
const exportRoutes = require('./routes/exportRoutes');
const settingsRoutes = require('./routes/settings');
const userRoutes = require('./routes/users');

const { runAlertEngine } = require('./services/alertEngine');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for SPA
  crossOriginEmbedderPolicy: false,
}));

// CORS — in production, served same origin; in dev allow Vite dev server
app.use(cors({
  origin: IS_PROD ? false : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Health check (no auth)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/personal-use', personalUseRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/usage-log', usageLogRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reporting', reportingRoutes);
app.use('/api/import', importRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);

// Serve React app if dist exists
const clientBuild = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n FINDEX Fleet Dashboard running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

  // In production, run db push + seed in the background AFTER the server is
  // already listening so Railway's healthcheck can pass immediately.
  if (process.env.NODE_ENV === 'production') {
    console.log('[Startup] Running prisma db push + seed in background...');
    exec(
      'npx prisma db push --accept-data-loss && npx prisma db seed',
      { cwd: __dirname },
      async (err) => {
        if (err) {
          console.error('[Startup] prisma db push/seed error:', err.message);
        } else {
          console.log('[Startup] DB schema + seed complete.');
        }
        // Run alert engine after migrations finish
        try {
          await runAlertEngine();
        } catch (e) {
          console.error('[AlertEngine] Startup check failed:', e.message);
        }
      }
    );
  } else {
    // Dev: alert engine only, no migrations
    runAlertEngine().catch(err =>
      console.error('[AlertEngine] Startup check failed:', err.message)
    );
  }
});

module.exports = app;
