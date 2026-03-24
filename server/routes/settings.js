const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/settings
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'settings' } });
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, lastLogin: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json({ settings, users });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings
router.put('/', authMiddleware, async (req, res, next) => {
  try {
    const { discrepancyThresholdPct, contractExpiryWarningDays, staleOdometerDays } = req.body;

    const settings = await prisma.appSettings.upsert({
      where: { id: 'settings' },
      update: {
        ...(discrepancyThresholdPct !== undefined && { discrepancyThresholdPct: parseFloat(discrepancyThresholdPct) }),
        ...(contractExpiryWarningDays !== undefined && { contractExpiryWarningDays: parseInt(contractExpiryWarningDays) }),
        ...(staleOdometerDays !== undefined && { staleOdometerDays: parseInt(staleOdometerDays) }),
      },
      create: {
        id: 'settings',
        discrepancyThresholdPct: parseFloat(discrepancyThresholdPct) || 10,
        contractExpiryWarningDays: parseInt(contractExpiryWarningDays) || 90,
        staleOdometerDays: parseInt(staleOdometerDays) || 90,
      },
    });

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
