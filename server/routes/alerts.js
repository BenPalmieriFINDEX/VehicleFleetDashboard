const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const { runAlertEngine } = require('../services/alertEngine');

const prisma = new PrismaClient();

// GET /api/alerts
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        dismissals: { where: { userId: req.user.id } },
      },
    });

    const formatted = alerts.map(a => ({
      ...a,
      dismissed: a.dismissals.length > 0,
      dismissals: undefined,
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// GET /api/alerts/count — for nav badge
router.get('/count', authMiddleware, async (req, res, next) => {
  try {
    const dismissed = await prisma.alertDismissal.findMany({
      where: { userId: req.user.id },
      select: { alertId: true },
    });
    const dismissedIds = dismissed.map(d => d.alertId);

    const count = await prisma.alert.count({
      where: { id: { notIn: dismissedIds } },
    });

    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// PUT /api/alerts/:id/dismiss
router.put('/:id/dismiss', authMiddleware, async (req, res, next) => {
  try {
    await prisma.alertDismissal.upsert({
      where: { alertId_userId: { alertId: req.params.id, userId: req.user.id } },
      update: {},
      create: { alertId: req.params.id, userId: req.user.id },
    });
    res.json({ message: 'Alert dismissed' });
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts/refresh
router.post('/refresh', authMiddleware, async (req, res, next) => {
  try {
    const result = await runAlertEngine();
    res.json({ message: 'Alert refresh complete', ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
