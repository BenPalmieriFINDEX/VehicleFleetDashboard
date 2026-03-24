const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/contracts/expiring
router.get('/expiring', authMiddleware, async (req, res, next) => {
  try {
    const { days = 90, state, country } = req.query;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + parseInt(days));

    const where = {
      contractExpiryDate: { lte: cutoff },
      contractStatus: { not: 'Expired' },
    };
    if (state) where.state = state;
    if (country) where.country = country;

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { contractExpiryDate: 'asc' },
    });

    res.json(vehicles);
  } catch (err) {
    next(err);
  }
});

// GET /api/contracts — all vehicles sorted by expiry
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { state, country, status } = req.query;
    const where = {};
    if (state) where.state = state;
    if (country) where.country = country;
    if (status) where.contractStatus = status;

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { contractExpiryDate: 'asc' },
    });

    res.json(vehicles);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
