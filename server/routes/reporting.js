const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/reporting/summary
router.get('/summary', authMiddleware, async (req, res, next) => {
  try {
    const [totalVehicles, auVehicles, nzVehicles, activeContracts, takeHome, openFlags] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { country: 'AU' } }),
      prisma.vehicle.count({ where: { country: 'NZ' } }),
      prisma.vehicle.count({ where: { contractStatus: 'Active' } }),
      prisma.vehicle.count({ where: { takeHome: true } }),
      prisma.personalUseFlag.count({ where: { resolved: false } }),
    ]);

    const now = new Date();
    const in90 = new Date(); in90.setDate(in90.getDate() + 90);
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);

    const [expiring90, expiring30, overdueRego] = await Promise.all([
      prisma.vehicle.count({ where: { contractExpiryDate: { gte: now, lte: in90 }, contractStatus: 'Active' } }),
      prisma.vehicle.count({ where: { contractExpiryDate: { gte: now, lte: in30 }, contractStatus: 'Active' } }),
      prisma.vehicle.count({ where: { registrationPlateRenewalDate: { lte: now } } }),
    ]);

    res.json({
      totalVehicles, auVehicles, nzVehicles, activeContracts,
      takeHome, openFlags, expiring90, expiring30, overdueRego,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reporting/by-costcentre
router.get('/by-costcentre', authMiddleware, async (req, res, next) => {
  try {
    const { fyPeriod } = req.query;

    const vehicles = await prisma.vehicle.findMany({
      select: {
        id: true,
        customerCostCentre: true,
        level1: true,
        level2: true,
        level3: true,
        state: true,
        country: true,
        rentalInstallmentExGst: true,
      },
    });

    // Group by cost centre
    const byCostCentre = {};
    for (const v of vehicles) {
      const key = v.customerCostCentre || 'Unassigned';
      if (!byCostCentre[key]) {
        byCostCentre[key] = {
          costCentre: key,
          level1: v.level1,
          level2: v.level2,
          level3: v.level3,
          vehicleCount: 0,
          monthlyLeaseCost: 0,
        };
      }
      byCostCentre[key].vehicleCount++;
      byCostCentre[key].monthlyLeaseCost += (v.rentalInstallmentExGst || 0);
    }

    res.json(Object.values(byCostCentre));
  } catch (err) {
    next(err);
  }
});

// GET /api/reporting/by-chargetype
router.get('/by-chargetype', authMiddleware, async (req, res, next) => {
  try {
    const { fyPeriod } = req.query;
    const where = {};
    if (fyPeriod) where.fyPeriod = fyPeriod;

    const charges = await prisma.charge.groupBy({
      by: ['chargeType', 'fyPeriod'],
      where,
      _sum: { amountExGst: true, amountIncGst: true },
      _count: true,
    });

    res.json(charges);
  } catch (err) {
    next(err);
  }
});

// GET /api/reporting/fleet-by-state
router.get('/fleet-by-state', authMiddleware, async (req, res, next) => {
  try {
    const byState = await prisma.vehicle.groupBy({
      by: ['state'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    res.json(byState.map(s => ({ state: s.state || 'Unknown', count: s._count.id })));
  } catch (err) {
    next(err);
  }
});

// GET /api/reporting/fleet-by-make
router.get('/fleet-by-make', authMiddleware, async (req, res, next) => {
  try {
    const byMake = await prisma.vehicle.groupBy({
      by: ['make'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    res.json(byMake.map(m => ({ make: m.make || 'Unknown', count: m._count.id })));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
