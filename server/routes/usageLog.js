const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/usage-log
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { vehicleId, driverName, status, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const where = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (driverName) where.driverName = { contains: driverName, mode: 'insensitive' };
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.pickupDatetime = {};
      if (dateFrom) where.pickupDatetime.gte = new Date(dateFrom);
      if (dateTo) where.pickupDatetime.lte = new Date(dateTo);
    }

    const [entries, total] = await Promise.all([
      prisma.vehicleUsageLog.findMany({
        where,
        orderBy: { pickupDatetime: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          vehicle: { select: { registration: true, make: true, model: true } },
          loggedBy: { select: { name: true } },
        },
      }),
      prisma.vehicleUsageLog.count({ where }),
    ]);

    res.json({ entries, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

// POST /api/usage-log
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const {
      vehicleId, driverName, purpose, pickupDatetime,
      dropoffDatetime, pickupOdometer, dropoffOdometer, notes,
    } = req.body;

    if (!vehicleId || !driverName || !pickupDatetime) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'vehicleId, driverName, and pickupDatetime are required',
        statusCode: 400,
      });
    }

    let tripKm = null;
    if (pickupOdometer && dropoffOdometer) {
      tripKm = parseInt(dropoffOdometer) - parseInt(pickupOdometer);
    }

    const entry = await prisma.vehicleUsageLog.create({
      data: {
        vehicleId,
        loggedById: req.user.id,
        driverName,
        purpose,
        pickupDatetime: new Date(pickupDatetime),
        dropoffDatetime: dropoffDatetime ? new Date(dropoffDatetime) : null,
        pickupOdometer: pickupOdometer ? parseInt(pickupOdometer) : null,
        dropoffOdometer: dropoffOdometer ? parseInt(dropoffOdometer) : null,
        tripKm,
        status: dropoffDatetime ? 'COMPLETED' : 'ACTIVE',
        notes,
      },
      include: {
        vehicle: { select: { registration: true, make: true, model: true } },
        loggedBy: { select: { name: true } },
      },
    });

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// GET /api/usage-log/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const entry = await prisma.vehicleUsageLog.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle: { select: { registration: true, make: true, model: true, driverName: true } },
        loggedBy: { select: { name: true } },
      },
    });
    if (!entry) return res.status(404).json({ error: 'NotFound', message: 'Entry not found', statusCode: 404 });
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

// PUT /api/usage-log/:id
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const existing = await prisma.vehicleUsageLog.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Entry not found', statusCode: 404 });

    const { driverName, purpose, pickupDatetime, dropoffDatetime, pickupOdometer, dropoffOdometer, notes, status } = req.body;

    let tripKm = existing.tripKm;
    const po = pickupOdometer !== undefined ? parseInt(pickupOdometer) : existing.pickupOdometer;
    const doo = dropoffOdometer !== undefined ? parseInt(dropoffOdometer) : existing.dropoffOdometer;
    if (po && doo) tripKm = doo - po;

    const updated = await prisma.vehicleUsageLog.update({
      where: { id: req.params.id },
      data: {
        driverName: driverName || existing.driverName,
        purpose: purpose !== undefined ? purpose : existing.purpose,
        pickupDatetime: pickupDatetime ? new Date(pickupDatetime) : existing.pickupDatetime,
        dropoffDatetime: dropoffDatetime ? new Date(dropoffDatetime) : existing.dropoffDatetime,
        pickupOdometer: po,
        dropoffOdometer: doo,
        tripKm,
        status: status || existing.status,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PUT /api/usage-log/:id/return
router.put('/:id/return', authMiddleware, async (req, res, next) => {
  try {
    const { dropoffDatetime, dropoffOdometer, notes } = req.body;
    const existing = await prisma.vehicleUsageLog.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Entry not found', statusCode: 404 });

    let tripKm = existing.tripKm;
    if (existing.pickupOdometer && dropoffOdometer) {
      tripKm = parseInt(dropoffOdometer) - existing.pickupOdometer;
    }

    const updated = await prisma.vehicleUsageLog.update({
      where: { id: req.params.id },
      data: {
        dropoffDatetime: dropoffDatetime ? new Date(dropoffDatetime) : new Date(),
        dropoffOdometer: dropoffOdometer ? parseInt(dropoffOdometer) : null,
        tripKm,
        status: 'COMPLETED',
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
