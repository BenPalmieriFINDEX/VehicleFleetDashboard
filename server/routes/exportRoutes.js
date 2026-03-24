const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { generatePDF } = require('../services/pdf');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// POST /api/export/pdf/:reportType
router.post('/pdf/:reportType', authMiddleware, async (req, res, next) => {
  try {
    const { reportType } = req.params;
    const filters = req.body;

    const validTypes = ['fleet', 'vehicle', 'contracts', 'personal-use', 'cost-centre', 'usage-log'];
    if (!validTypes.includes(reportType)) {
      return res.status(400).json({ error: 'BadRequest', message: 'Invalid report type', statusCode: 400 });
    }

    const pdfBuffer = await generatePDF(reportType, filters, req.user, prisma);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="findex-fleet-${reportType}-${Date.now()}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

// GET /api/export/csv/fleet
router.get('/csv/fleet', authMiddleware, async (req, res, next) => {
  try {
    const vehicles = await prisma.vehicle.findMany({ orderBy: { registration: 'asc' } });

    const headers = [
      'Registration', 'Make', 'Model', 'Variant', 'Year', 'Colour', 'State', 'Country',
      'Driver Name', 'Contract Status', 'Contract Expiry', 'Take Home', 'Pool Car',
      'Annual KMs', 'Rental (ex GST)', 'Location',
    ];

    const rows = vehicles.map(v => [
      v.registration, v.make, v.model, v.variant, v.modelYear, v.colour, v.state, v.country,
      v.driverName, v.contractStatus,
      v.contractExpiryDate ? v.contractExpiryDate.toISOString().split('T')[0] : '',
      v.takeHome ? 'Yes' : 'No',
      v.poolCar ? 'Yes' : 'No',
      v.annualisedKms, v.rentalInstallmentExGst, v.location,
    ]);

    const csv = [headers, ...rows].map(r => r.map(cell =>
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell ?? ''
    ).join(',')).join('\n');

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="findex-fleet-${Date.now()}.csv"`,
    });

    res.send(csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
