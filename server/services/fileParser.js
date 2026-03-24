const XLSX = require('xlsx');
const fs = require('fs');

const NZ_STATES = ['auckland', 'wellington', 'canterbury', 'otago', 'waikato', 'bay of plenty', 'manawatu', 'northland', 'southland', 'taranaki', 'hawke\'s bay', 'nelson', 'marlborough', 'west coast', 'gisborne', 'tasman'];

function deriveCountry(state) {
  if (!state) return 'AU';
  return NZ_STATES.includes(state.toLowerCase()) ? 'NZ' : 'AU';
}

function parseExcelDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Excel serial date
    return new Date((val - 25569) * 86400 * 1000);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function toFloat(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? null : n;
}

function toInt(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseInt(String(val).replace(/[^0-9-]/g, ''));
  return isNaN(n) ? null : n;
}

function toBool(val) {
  if (!val) return false;
  return ['yes', 'true', '1', 'y'].includes(String(val).toLowerCase());
}

// Column name normalization map — maps SG Fleet CSV headers to schema fields
const COLUMN_MAP = {
  'registration': 'registration',
  'rego': 'registration',
  'registration number': 'registration',
  'contract ref': 'contractRef',
  'contract reference': 'contractRef',
  'make': 'make',
  'model': 'model',
  'variant': 'variant',
  'model year': 'modelYear',
  'year': 'modelYear',
  'asset class': 'assetClass',
  'transmission type': 'transmissionType',
  'transmission': 'transmissionType',
  'body type': 'bodyType',
  'colour': 'colour',
  'color': 'colour',
  'drive type': 'driveType',
  'state': 'state',
  'engine type': 'engineType',
  'fuel type': 'fuelType',
  'co2 emissions': 'co2Emissions',
  'co2': 'co2Emissions',
  'vin': 'vin',
  'tare (kg)': 'tareKg',
  'tare': 'tareKg',
  'gvm (kg)': 'gvmKg',
  'gvm': 'gvmKg',
  'build date': 'buildDate',
  'vehicle warranty': 'vehicleWarranty',
  'engine number': 'engineNumber',
  'no. of cylinders': 'numCylinders',
  'cylinders': 'numCylinders',
  'company': 'company',
  'customer cost centre': 'customerCostCentre',
  'cost centre': 'customerCostCentre',
  'location': 'location',
  'take home': 'takeHome',
  'contract term': 'contractTerm',
  'date in service': 'dateInService',
  'contract status': 'contractStatus',
  'contract start date': 'contractStartDate',
  'contract expiry date': 'contractExpiryDate',
  'contract expiry': 'contractExpiryDate',
  'contract distance': 'contractDistance',
  'driver name': 'driverName',
  'driver': 'driverName',
  'pool car': 'poolCar',
  'product description': 'productDescription',
  'purchase date': 'purchaseDate',
  'registration plate renewal date': 'registrationPlateRenewalDate',
  'rego renewal date': 'registrationPlateRenewalDate',
  'rental installment ex gst': 'rentalInstallmentExGst',
  'rental (ex gst)': 'rentalInstallmentExGst',
  'excess km rate': 'excessKmRate',
  'contract end kms': 'contractEndKms',
  'fbt base value': 'fbtBaseValue',
  'fbt exempt': 'fbtExempt',
  'fbt opening odo': 'fbtOpeningOdo',
  'selected fbt method': 'selectedFbtMethod',
  'motor association': 'motorAssociation',
  'fuel description': 'fuelDescription',
  'maintenance type description': 'maintenanceTypeDescription',
  'registration renewal': 'registrationRenewal',
  'accident management policy': 'accidentManagementPolicy',
  'annualised kms': 'annualisedKms',
  'vehicle id': 'vehicleId',
  'fuel tank capacity': 'fuelTankCapacity',
  'star rating': 'starRating',
  'greenhouse': 'greenhouse',
  'air pollution': 'airPollution',
  'ancap rating': 'ancapRating',
  'inventory status': 'inventoryStatus',
  'country of manufacture': 'countryOfManufacture',
  'financier': 'financier',
  'driver mobile phone': 'driverMobilePhone',
  'driver mobile': 'driverMobilePhone',
  'driver email address': 'driverEmailAddress',
  'driver email': 'driverEmailAddress',
  'level1': 'level1',
  'level 1': 'level1',
  'level2': 'level2',
  'level 2': 'level2',
  'level3': 'level3',
  'level 3': 'level3',
};

function mapRow(headers, rawRow) {
  const mapped = {};
  for (const [header, value] of Object.entries(rawRow)) {
    const normalized = header.toLowerCase().trim();
    const field = COLUMN_MAP[normalized];
    if (field) mapped[field] = value;
  }
  return mapped;
}

function transformRow(row) {
  if (!row.registration) return null;

  const transformed = {
    registration: String(row.registration).trim().toUpperCase(),
    contractRef: row.contractRef ? String(row.contractRef).trim() : null,
    make: row.make ? String(row.make).trim() : null,
    model: row.model ? String(row.model).trim() : null,
    variant: row.variant ? String(row.variant).trim() : null,
    modelYear: toInt(row.modelYear),
    assetClass: row.assetClass ? String(row.assetClass).trim() : null,
    transmissionType: row.transmissionType ? String(row.transmissionType).trim() : null,
    bodyType: row.bodyType ? String(row.bodyType).trim() : null,
    colour: row.colour ? String(row.colour).trim() : null,
    driveType: row.driveType ? String(row.driveType).trim() : null,
    state: row.state ? String(row.state).trim() : null,
    engineType: row.engineType ? String(row.engineType).trim() : null,
    fuelType: row.fuelType ? String(row.fuelType).trim() : null,
    co2Emissions: toFloat(row.co2Emissions),
    vin: row.vin ? String(row.vin).trim() : null,
    tareKg: toFloat(row.tareKg),
    gvmKg: toFloat(row.gvmKg),
    buildDate: parseExcelDate(row.buildDate),
    vehicleWarranty: row.vehicleWarranty ? String(row.vehicleWarranty).trim() : null,
    engineNumber: row.engineNumber ? String(row.engineNumber).trim() : null,
    numCylinders: toInt(row.numCylinders),
    company: row.company ? String(row.company).trim() : null,
    customerCostCentre: row.customerCostCentre ? String(row.customerCostCentre).trim() : null,
    location: row.location ? String(row.location).trim() : null,
    takeHome: toBool(row.takeHome),
    contractTerm: toInt(row.contractTerm),
    dateInService: parseExcelDate(row.dateInService),
    contractStatus: row.contractStatus ? String(row.contractStatus).trim() : null,
    contractStartDate: parseExcelDate(row.contractStartDate),
    contractExpiryDate: parseExcelDate(row.contractExpiryDate),
    contractDistance: toInt(row.contractDistance),
    driverName: row.driverName ? String(row.driverName).trim() : null,
    poolCar: toBool(row.poolCar),
    productDescription: row.productDescription ? String(row.productDescription).trim() : null,
    purchaseDate: parseExcelDate(row.purchaseDate),
    registrationPlateRenewalDate: parseExcelDate(row.registrationPlateRenewalDate),
    rentalInstallmentExGst: toFloat(row.rentalInstallmentExGst),
    excessKmRate: toFloat(row.excessKmRate),
    contractEndKms: toInt(row.contractEndKms),
    fbtBaseValue: toFloat(row.fbtBaseValue),
    fbtExempt: toBool(row.fbtExempt),
    fbtOpeningOdo: toInt(row.fbtOpeningOdo),
    selectedFbtMethod: row.selectedFbtMethod ? String(row.selectedFbtMethod).trim() : null,
    motorAssociation: row.motorAssociation ? String(row.motorAssociation).trim() : null,
    fuelDescription: row.fuelDescription ? String(row.fuelDescription).trim() : null,
    maintenanceTypeDescription: row.maintenanceTypeDescription ? String(row.maintenanceTypeDescription).trim() : null,
    registrationRenewal: row.registrationRenewal ? String(row.registrationRenewal).trim() : null,
    accidentManagementPolicy: row.accidentManagementPolicy ? String(row.accidentManagementPolicy).trim() : null,
    annualisedKms: toInt(row.annualisedKms),
    vehicleId: row.vehicleId ? String(row.vehicleId).trim() : null,
    fuelTankCapacity: toFloat(row.fuelTankCapacity),
    starRating: toFloat(row.starRating),
    greenhouse: toFloat(row.greenhouse),
    airPollution: toFloat(row.airPollution),
    ancapRating: toFloat(row.ancapRating),
    inventoryStatus: row.inventoryStatus ? String(row.inventoryStatus).trim() : null,
    countryOfManufacture: row.countryOfManufacture ? String(row.countryOfManufacture).trim() : null,
    financier: row.financier ? String(row.financier).trim() : null,
    driverMobilePhone: row.driverMobilePhone ? String(row.driverMobilePhone).trim() : null,
    driverEmailAddress: row.driverEmailAddress ? String(row.driverEmailAddress).trim() : null,
    level1: row.level1 ? String(row.level1).trim() : null,
    level2: row.level2 ? String(row.level2).trim() : null,
    level3: row.level3 ? String(row.level3).trim() : null,
  };

  // Derive country from state
  transformed.country = deriveCountry(transformed.state);

  return transformed;
}

async function parseFleetCSV(filePath, filename) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const rows = [];
  const errors = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rawRow = rawRows[i];
    const mapped = mapRow(Object.keys(rawRow), rawRow);
    const transformed = transformRow(mapped);
    if (transformed) {
      rows.push(transformed);
    } else {
      errors.push({ row: i + 2, error: 'Missing registration number' });
    }
  }

  return { rows, errors, total: rawRows.length };
}

async function parseStatementFile(filePath, fileType) {
  if (fileType === 'EXCEL') {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    const rows = rawRows.map(row => {
      const r = {};
      for (const [k, v] of Object.entries(row)) {
        const key = k.toLowerCase().trim();
        if (key.includes('registration') || key === 'rego') r.registration = String(v || '').trim().toUpperCase();
        else if (key.includes('charge type') || key.includes('chargetype')) r.chargeType = mapChargeType(String(v || ''));
        else if (key.includes('amount ex gst') || key.includes('ex gst')) r.amountExGst = toFloat(v);
        else if (key.includes('amount inc gst') || key.includes('inc gst')) r.amountIncGst = toFloat(v);
        else if (key.includes('charge date') || key.includes('date')) r.chargeDate = parseExcelDate(v);
        else if (key.includes('description')) r.description = String(v || '').trim();
        else if (key.includes('fy period') || key.includes('period')) r.fyPeriod = String(v || '').trim();
      }
      return r;
    }).filter(r => r.registration);

    return { rows, requiresManualReview: false };
  }

  // PDF parsing
  try {
    let pdfParse;
    try { pdfParse = require('pdf-parse'); } catch { return { requiresManualReview: true, rawText: 'pdf-parse not available' }; }

    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const text = data.text;

    // Pattern match for registration numbers and amounts
    const rows = [];
    const lines = text.split('\n').filter(l => l.trim());

    const regoPattern = /\b([A-Z]{2,3}[0-9]{2,4}|[0-9]{1,3}[A-Z]{2,3})\b/;
    const amountPattern = /\$?([\d,]+\.?\d{0,2})/;

    for (const line of lines) {
      const regoMatch = line.match(regoPattern);
      const amountMatches = line.match(new RegExp(amountPattern.source, 'g'));
      if (regoMatch && amountMatches) {
        rows.push({
          registration: regoMatch[1],
          amountExGst: toFloat(amountMatches[0]?.replace(/[$,]/g, '')),
          amountIncGst: toFloat(amountMatches[1]?.replace(/[$,]/g, '') || amountMatches[0]?.replace(/[$,]/g, '')),
          description: line.trim(),
        });
      }
    }

    if (rows.length === 0) {
      return { requiresManualReview: true, rawText: text };
    }

    return { rows, requiresManualReview: false };
  } catch (err) {
    return { requiresManualReview: true, rawText: `Parse error: ${err.message}` };
  }
}

function mapChargeType(val) {
  const v = val.toLowerCase();
  if (v.includes('registr') || v.includes('rego')) return 'REGISTRATION';
  if (v.includes('lease') || v.includes('rental')) return 'LEASE';
  if (v.includes('fuel')) return 'FUEL';
  if (v.includes('maint') || v.includes('service')) return 'MAINTENANCE';
  if (v.includes('insur')) return 'INSURANCE';
  return 'OTHER';
}

module.exports = { parseFleetCSV, parseStatementFile };
