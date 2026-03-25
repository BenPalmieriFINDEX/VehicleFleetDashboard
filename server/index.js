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

console.log('[BOOT] Loading modules...');

let express, cors, helmet, cookieParser, path, fs;
let errorHandler;
let authRoutes, vehicleRoutes, personalUseRoutes, contractRoutes;
let usageLogRoutes, alertRoutes, reportingRoutes, importRoutes;
let aiRoutes, exportRoutes, settingsRoutes, userRoutes;
let runAlertEngine;

try {
  express     = require('express');
  cors        = require('cors');
  helmet      = require('helmet');
  cookieParser = require('cookie-parser');
  path        = require('path');
  fs          = require('fs');
  console.log('[BOOT] Core modules loaded');

  errorHandler       = require('./middleware/errorHandler');
  authRoutes         = require('./routes/auth');
  vehicleRoutes      = require('./routes/vehicles');
  personalUseRoutes  = require('./routes/personalUse');
  contractRoutes     = require('./routes/contracts');
  usageLogRoutes     = require('./routes/usageLog');
  alertRoutes        = require('./routes/alerts');
  reportingRoutes    = require('./routes/reporting');
  importRoutes       = require('./routes/importRoutes');
  aiRoutes           = require('./routes/ai');
  exportRoutes       = require('./routes/exportRoutes');
  settingsRoutes     = require('./routes/settings');
  userRoutes         = require('./routes/users');
  ({ runAlertEngine } = require('./services/alertEngine'));
  console.log('[BOOT] All routes loaded');
} catch (err) {
  console.error('[FATAL] Module load failed:', err);
  process.exit(1);
}

const { exec } = require('child_process');
const app  = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

console.log(`[BOOT] PORT=${PORT} NODE_ENV=${process.env.NODE_ENV}`);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
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

console.log('[BOOT] Starting server...');
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[READY] Listening on 0.0.0.0:${PORT}`);

  if (IS_PROD) {
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
        try {
          await runAlertEngine();
        } catch (e) {
          console.error('[AlertEngine] Startup check failed:', e.message);
        }
      }
    );
  } else {
    runAlertEngine().catch(err =>
      console.error('[AlertEngine] Startup check failed:', err.message)
    );
  }
});

module.exports = app;
