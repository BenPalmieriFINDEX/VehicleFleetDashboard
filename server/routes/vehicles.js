const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const { logAudit } = require('../services/audit');

const prisma = new PrismaClient();

// GET /api/vehicles
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const {
      search, state, country, contractStatus, assetClass,
      fuelType, takeHome, poolCar, page = 1, limit = 100,
      sortBy = 'registration', sortOrder = 'asc',
    } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { registration: { contains: search, mode: 'insensitive' } },
        { driverName: { contains: search, mode: 'insensitive' } },
        { make: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (state) where.state = state;
    if (country) where.country = country;
    if (contractStatus) where.contractStatus = contractStatus;
    if (assetClass) where.assetClass = assetClass;
    if (fuelType) where.fuelType = fuelType;
    if (takeHome !== undefined) where.takeHome = takeHome === 'true';
    if (poolCar !== undefined) where.poolCar = poolCar === 'true';

    const allowedSort = ['registration', 'make', 'model', 'driverName', 'state', 'contractExpiryDate', 'createdAt'];
    const orderBy = allowedSort.includes(sortBy) ? { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' } : { registration: 'asc' };

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        orderBy,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          odometerReadings: { orderBy: { readingDate: 'desc' }, take: 1 },
          personalUseFlags: { where: { resolved: false } },
        },
      }),
      prisma.vehicle.count({ where }),
    ]);

    res.json({ vehicles, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/vehicles/:registration
router.get('/:registration', authMiddleware, async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { registration: req.params.registration.toUpperCase() },
      include: {
        odometerReadings: { orderBy: { readingDate: 'desc' }, take: 1 },
        personalUseFlags: { where: { resolved: false } },
      },
    });
    if (!vehicle) {
      return res.status(404).json({ error: 'NotFound', message: 'Vehicle not found', statusCode: 404 });
    }
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
});

// PUT /api/vehicles/:registration
router.put('/:registration', authMiddleware, async (req, res, next) => {
  try {
    const registration = req.params.registration.toUpperCase();
    const existing = await prisma.vehicle.findUnique({ where: { registration } });
    if (!existing) {
      return res.status(404).json({ error: 'NotFound', message: 'Vehicle not found', statusCode: 404 });
    }

    const allowedFields = [
      'driverName', 'driverMobilePhone', 'driverEmailAddress', 'location',
      'state', 'notes', 'takeHome', 'poolCar', 'customerCostCentre',
      'contractStatus', 'company',
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const updated = await prisma.vehicle.update({
      where: { registration },
      data: updates,
    });

    await logAudit({
      userId: req.user.id,
      action: 'VEHICLE_UPDATED',
      entityType: 'vehicle',
      entityId: existing.id,
      oldValues: existing,
      newValues: updated,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/vehicles/:registration/odometer
router.get('/:registration/odometer', authMiddleware, async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { registration: req.params.registration.toUpperCase() },
    });
    if (!vehicle) return res.status(404).json({ error: 'NotFound', message: 'Vehicle not found', statusCode: 404 });

    const readings = await prisma.odometerReading.findMany({
      where: { vehicleId: vehicle.id },
      orderBy: { readingDate: 'desc' },
      include: { createdBy: { select: { name: true } } },
    });
    res.json(readings);
  } catch (err) {
    next(err);
  }
});

// POST /api/vehicles/:registration/odometer
router.post('/:registration/odometer', authMiddleware, async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { registration: req.params.registration.toUpperCase() },
    });
    if (!vehicle) return res.status(404).json({ error: 'NotFound', message: 'Vehicle not found', statusCode: 404 });

    const { readingKm, readingDate, notes } = req.body;
    if (!readingKm || !readingDate) {
      return res.status(400).json({ error: 'BadRequest', message: 'readingKm and readingDate required', statusCode: 400 });
    }

    const reading = await prisma.odometerReading.create({
      data: {
        vehicleId: vehicle.id,
        readingKm: parseInt(readingKm),
        readingDate: new Date(readingDate),
        source: 'MANUAL',
        notes,
        createdById: req.user.id,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'ODO_ADDED',
      entityType: 'vehicle',
      entityId: vehicle.id,
      newValues: reading,
      ipAddress: req.ip,
    });

    res.status(201).json(reading);
  } catch (err) {
    next(err);
  }
});

// GET /api/vehicles/:registration/charges
router.get('/:registration/charges', authMiddleware, async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { registration: req.params.registration.toUpperCase() },
    });
    if (!vehicle) return res.status(404).json({ error: 'NotFound', message: 'Vehicle not found', statusCode: 404 });

    const { fyPeriod } = req.query;
    const where = { vehicleId: vehicle.id };
    if (fyPeriod) where.fyPeriod = fyPeriod;

    const charges = await prisma.charge.findMany({
      where,
      orderBy: { chargeDate: 'desc' },
    });
    res.json(charges);
  } catch (err) {
    next(err);
  }
});

// GET /api/vehicles/:registration/flags
router.get('/:registration/flags', authMiddleware, async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { registration: req.params.registration.toUpperCase() },
    });
    if (!vehicle) return res.status(404).json({ error: 'NotFound', message: 'Vehicle not found', statusCode: 404 });

    const flags = await prisma.personalUseFlag.findMany({
      where: { vehicleId: vehicle.id },
      orderBy: { createdAt: 'desc' },
      include: {
        flaggedBy: { select: { name: true } },
        resolvedBy: { select: { name: true } },
      },
    });
    res.json(flags);
  } catch (err) {
    next(err);
  }
});

// GET /api/vehicles/:registration/audit
router.get('/:registration/audit', authMiddleware, async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { registration: req.params.registration.toUpperCase() },
    });
    if (!vehicle) return res.status(404).json({ error: 'NotFound', message: 'Vehicle not found', statusCode: 404 });

    const logs = await prisma.auditLog.findMany({
      where: { entityId: vehicle.id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// GET /api/vehicles/:registration/usage-log
router.get('/:registration/usage-log', authMiddleware, async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { registration: req.params.registration.toUpperCase() },
    });
    if (!vehicle) return res.status(404).json({ error: 'NotFound', message: 'Vehicle not found', statusCode: 404 });

    const logs = await prisma.vehicleUsageLog.findMany({
      where: { vehicleId: vehicle.id },
      orderBy: { pickupDatetime: 'desc' },
      include: { loggedBy: { select: { name: true } } },
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
