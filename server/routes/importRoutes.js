const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const { parseFleetCSV, parseStatementFile } = require('../services/fileParser');
const { logAudit } = require('../services/audit');

const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only CSV, Excel, and PDF files are allowed'));
  },
});

// POST /api/import/fleet
router.post('/fleet', authMiddleware, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'BadRequest', message: 'No file uploaded', statusCode: 400 });
    }

    const result = await parseFleetCSV(req.file.path, req.file.originalname);

    if (req.query.preview === 'true') {
      return res.json({ preview: result.rows.slice(0, 5), total: result.rows.length });
    }

    // Upsert vehicles
    let added = 0, updated = 0, errors = [];

    for (const row of result.rows) {
      try {
        const existing = await prisma.vehicle.findUnique({
          where: { registration: row.registration },
        });

        await prisma.vehicle.upsert({
          where: { registration: row.registration },
          update: row,
          create: row,
        });

        if (existing) updated++;
        else added++;
      } catch (e) {
        errors.push({ registration: row.registration, error: e.message });
      }
    }

    await logAudit({
      userId: req.user.id,
      action: 'IMPORT_COMPLETED',
      entityType: 'fleet_import',
      entityId: req.file.filename,
      newValues: { added, updated, errors: errors.length },
      ipAddress: req.ip,
    });

    res.json({ added, updated, errors, total: result.rows.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/import/statements
router.post('/statements', authMiddleware, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'BadRequest', message: 'No file uploaded', statusCode: 400 });
    }

    const { fyPeriod } = req.body;
    if (!fyPeriod) {
      return res.status(400).json({ error: 'BadRequest', message: 'fyPeriod is required', statusCode: 400 });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileType = ext === '.pdf' ? 'PDF' : 'EXCEL';

    const result = await parseStatementFile(req.file.path, fileType);

    if (result.requiresManualReview) {
      return res.json({
        requiresManualReview: true,
        rawText: result.rawText,
        message: 'PDF could not be confidently parsed. Please review the raw text and import manually.',
      });
    }

    // Create import record
    const importRecord = await prisma.accountStatementImport.create({
      data: {
        filename: req.file.originalname,
        fileType,
        fyPeriod,
        importedById: req.user.id,
        rowCount: result.rows.length,
        originalFilePath: req.file.path,
        fileSize: req.file.size,
      },
    });

    let matched = 0, unmatched = [], errors = [];

    for (const row of result.rows) {
      try {
        const vehicle = await prisma.vehicle.findUnique({
          where: { registration: row.registration },
        });

        if (!vehicle) {
          unmatched.push(row.registration);
          continue;
        }

        await prisma.charge.create({
          data: {
            vehicleId: vehicle.id,
            importId: importRecord.id,
            chargeType: row.chargeType || 'OTHER',
            amountExGst: Math.round((parseFloat(row.amountExGst) || 0) * 100),
            amountIncGst: Math.round((parseFloat(row.amountIncGst) || 0) * 100),
            chargeDate: row.chargeDate ? new Date(row.chargeDate) : new Date(),
            description: row.description,
            fyPeriod,
          },
        });

        matched++;
      } catch (e) {
        errors.push({ registration: row.registration, error: e.message });
      }
    }

    await prisma.accountStatementImport.update({
      where: { id: importRecord.id },
      data: { rowCount: matched },
    });

    res.json({
      importId: importRecord.id,
      matched,
      unmatched,
      errors,
      total: result.rows.length,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/import/history
router.get('/history', authMiddleware, async (req, res, next) => {
  try {
    const imports = await prisma.accountStatementImport.findMany({
      orderBy: { importDate: 'desc' },
      include: { importedBy: { select: { name: true } } },
    });
    res.json(imports);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
