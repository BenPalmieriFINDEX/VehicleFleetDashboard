const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const { logAudit } = require('../services/audit');

const prisma = new PrismaClient();

// GET /api/personal-use/flags
router.get('/flags', authMiddleware, async (req, res, next) => {
  try {
    const { resolved, severity, vehicleId } = req.query;
    const where = {};
    if (resolved !== undefined) where.resolved = resolved === 'true';
    if (severity) where.severity = severity;
    if (vehicleId) where.vehicleId = vehicleId;

    const flags = await prisma.personalUseFlag.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { registration: true, make: true, model: true, driverName: true } },
        flaggedBy: { select: { name: true } },
        resolvedBy: { select: { name: true } },
      },
    });
    res.json(flags);
  } catch (err) {
    next(err);
  }
});

// POST /api/personal-use/flags
router.post('/flags', authMiddleware, async (req, res, next) => {
  try {
    const { vehicleId, reason, odoAtFlag, expectedOdo, discrepancyKm, severity } = req.body;
    if (!vehicleId || !severity) {
      return res.status(400).json({ error: 'BadRequest', message: 'vehicleId and severity required', statusCode: 400 });
    }

    const flag = await prisma.personalUseFlag.create({
      data: {
        vehicleId,
        flagDate: new Date(),
        flaggedById: req.user.id,
        reason,
        odoAtFlag: odoAtFlag ? parseInt(odoAtFlag) : null,
        expectedOdo: expectedOdo ? parseInt(expectedOdo) : null,
        discrepancyKm: discrepancyKm ? parseInt(discrepancyKm) : null,
        severity,
        resolved: false,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'FLAG_CREATED',
      entityType: 'vehicle',
      entityId: vehicleId,
      newValues: flag,
      ipAddress: req.ip,
    });

    res.status(201).json(flag);
  } catch (err) {
    next(err);
  }
});

// PUT /api/personal-use/flags/:id/resolve
router.put('/flags/:id/resolve', authMiddleware, async (req, res, next) => {
  try {
    const { resolutionNotes } = req.body;
    const flag = await prisma.personalUseFlag.findUnique({ where: { id: req.params.id } });
    if (!flag) return res.status(404).json({ error: 'NotFound', message: 'Flag not found', statusCode: 404 });

    const updated = await prisma.personalUseFlag.update({
      where: { id: req.params.id },
      data: {
        resolved: true,
        resolvedDate: new Date(),
        resolvedById: req.user.id,
        resolutionNotes,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'FLAG_RESOLVED',
      entityType: 'vehicle',
      entityId: flag.vehicleId,
      oldValues: flag,
      newValues: updated,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/personal-use/summary — for dashboard
router.get('/summary', authMiddleware, async (req, res, next) => {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'settings' } });
    const threshold = settings?.discrepancyThresholdPct || 10;

    const takeHomeVehicles = await prisma.vehicle.findMany({
      where: { takeHome: true },
      include: {
        odometerReadings: { orderBy: { readingDate: 'desc' }, take: 1 },
        personalUseFlags: { where: { resolved: false } },
      },
    });

    const results = takeHomeVehicles.map(v => {
      const latestOdo = v.odometerReadings[0];
      let expectedKm = null;
      let discrepancyPct = null;
      let severity = null;

      if (v.dateInService && v.annualisedKms) {
        const daysSince = Math.floor((new Date() - new Date(v.dateInService)) / (1000 * 60 * 60 * 24));
        expectedKm = Math.floor((v.annualisedKms / 365) * daysSince);

        if (latestOdo) {
          const actual = latestOdo.readingKm;
          discrepancyPct = ((actual - expectedKm) / expectedKm) * 100;

          if (discrepancyPct > 25) severity = 'ALERT';
          else if (discrepancyPct > threshold) severity = 'WARNING';
        }
      }

      return {
        vehicle: { id: v.id, registration: v.registration, make: v.make, model: v.model, driverName: v.driverName },
        latestOdo: latestOdo ? { km: latestOdo.readingKm, date: latestOdo.readingDate } : null,
        expectedKm,
        discrepancyPct: discrepancyPct !== null ? Math.round(discrepancyPct * 10) / 10 : null,
        severity,
        openFlags: v.personalUseFlags.length,
      };
    });

    res.json({ vehicles: results, threshold });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
