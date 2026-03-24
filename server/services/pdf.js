const puppeteer = require('puppeteer');
const { format } = require('date-fns');

function formatCurrency(cents) {
  if (!cents) return '$0.00';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);
}

function formatDate(date) {
  if (!date) return '—';
  try { return format(new Date(date), 'dd/MM/yyyy'); } catch { return '—'; }
}

const FINDEX_HEADER = `
<div style="background:#1B1F22;color:#fff;padding:20px 30px;display:flex;align-items:center;justify-content:space-between;">
  <div>
    <div style="font-family:'Source Sans Pro',Arial,sans-serif;font-weight:700;font-size:28px;letter-spacing:2px;">
      <span style="border-bottom:3px solid #D43D27;padding-bottom:2px;">FIN</span>DEX
    </div>
    <div style="font-size:11px;color:#aaa;margin-top:4px;">Vehicle Fleet Management</div>
  </div>
  <div style="text-align:right;font-size:11px;color:#aaa;">
    <div>Generated: {{DATE}}</div>
    <div>By: {{USER}}</div>
  </div>
</div>
`;

const BASE_STYLES = `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Source Sans Pro', Arial, sans-serif; color: #222; background: #fff; font-size: 11px; }
  h1 { font-size: 18px; color: #1B1F22; margin: 20px 30px 10px; }
  h2 { font-size: 14px; color: #1B1F22; margin: 15px 30px 8px; }
  table { width: calc(100% - 60px); margin: 0 30px 20px; border-collapse: collapse; }
  th { background: #1B1F22; color: #fff; padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #f8f8f8; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-orange { background: #fff7ed; color: #9a3412; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .footer { position: fixed; bottom: 20px; left: 30px; right: 30px; display: flex; justify-content: space-between; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 6px; }
  @page { margin: 0; size: A4 landscape; }
</style>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&display=swap" rel="stylesheet">
`;

async function generatePDF(reportType, filters, user, prisma) {
  let html = '';

  switch (reportType) {
    case 'fleet':
      html = await buildFleetPDF(filters, user, prisma);
      break;
    case 'vehicle':
      html = await buildVehiclePDF(filters, user, prisma);
      break;
    case 'contracts':
      html = await buildContractsPDF(filters, user, prisma);
      break;
    case 'personal-use':
      html = await buildPersonalUsePDF(filters, user, prisma);
      break;
    case 'cost-centre':
      html = await buildCostCentrePDF(filters, user, prisma);
      break;
    case 'usage-log':
      html = await buildUsageLogPDF(filters, user, prisma);
      break;
    default:
      throw new Error('Unknown report type');
  }

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new',
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
    return buffer;
  } finally {
    await browser.close();
  }
}

async function buildFleetPDF(filters, user, prisma) {
  const vehicles = await prisma.vehicle.findMany({ orderBy: { registration: 'asc' } });
  const now = formatDate(new Date());
  const header = FINDEX_HEADER.replace('{{DATE}}', now).replace('{{USER}}', user.name);

  const rows = vehicles.map((v, i) => {
    const days = v.contractExpiryDate
      ? Math.floor((new Date(v.contractExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null;
    const badgeClass = days === null ? '' : days < 0 ? 'badge-red' : days < 30 ? 'badge-orange' : 'badge-green';
    const status = days === null ? '—' : days < 0 ? 'Expired' : days < 30 ? `${days}d` : 'Active';

    return `<tr>
      <td>${v.registration}</td>
      <td>${v.make || ''} ${v.model || ''}</td>
      <td>${v.variant || ''}</td>
      <td>${v.modelYear || ''}</td>
      <td>${v.driverName || 'Pool'}</td>
      <td>${v.state || ''}</td>
      <td>${v.country || ''}</td>
      <td><span class="badge ${badgeClass}">${status}</span></td>
      <td>${formatDate(v.contractExpiryDate)}</td>
      <td>${v.takeHome ? 'Yes' : 'No'}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head>${BASE_STYLES}</head><body>
${header}
<h1>Fleet Register — ${vehicles.length} Vehicles</h1>
<table>
  <thead><tr><th>Rego</th><th>Vehicle</th><th>Variant</th><th>Year</th><th>Driver</th><th>State</th><th>Country</th><th>Status</th><th>Expiry</th><th>Take Home</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer"><span>FINDEX Vehicle Fleet Dashboard</span><span>Page 1</span></div>
</body></html>`;
}

async function buildContractsPDF(filters, user, prisma) {
  const now = new Date();
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { contractExpiryDate: 'asc' },
  });
  const dateStr = formatDate(now);
  const header = FINDEX_HEADER.replace('{{DATE}}', dateStr).replace('{{USER}}', user.name);

  const rows = vehicles.map(v => {
    const days = v.contractExpiryDate
      ? Math.floor((new Date(v.contractExpiryDate) - now) / (1000 * 60 * 60 * 24))
      : null;
    const badgeClass = days === null ? '' : days < 0 ? 'badge-red' : days <= 30 ? 'badge-red' : days <= 90 ? 'badge-orange' : 'badge-green';
    const statusLabel = days === null ? '—' : days < 0 ? 'Expired' : days <= 30 ? `${days}d — URGENT` : days <= 90 ? `${days}d` : 'OK';

    return `<tr>
      <td>${v.registration}</td>
      <td>${v.make || ''} ${v.model || ''}</td>
      <td>${v.driverName || 'Pool'}</td>
      <td>${v.state || ''}</td>
      <td>${formatDate(v.contractStartDate)}</td>
      <td>${formatDate(v.contractExpiryDate)}</td>
      <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
      <td>${v.contractDistance ? v.contractDistance.toLocaleString() + ' km' : '—'}</td>
      <td>${formatDate(v.registrationPlateRenewalDate)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head>${BASE_STYLES}</head><body>
${header}
<h1>Contracts & Renewals Report</h1>
<table>
  <thead><tr><th>Rego</th><th>Vehicle</th><th>Driver</th><th>State</th><th>Start</th><th>Expiry</th><th>Status</th><th>Distance</th><th>Rego Renewal</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer"><span>FINDEX Vehicle Fleet Dashboard</span><span>Page 1</span></div>
</body></html>`;
}

async function buildPersonalUsePDF(filters, user, prisma) {
  const flags = await prisma.personalUseFlag.findMany({
    where: { resolved: false },
    include: {
      vehicle: { select: { registration: true, make: true, model: true, driverName: true } },
      flaggedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const dateStr = formatDate(new Date());
  const header = FINDEX_HEADER.replace('{{DATE}}', dateStr).replace('{{USER}}', user.name);

  const rows = flags.map(f => `<tr>
    <td>${f.vehicle.registration}</td>
    <td>${f.vehicle.make || ''} ${f.vehicle.model || ''}</td>
    <td>${f.vehicle.driverName || '—'}</td>
    <td><span class="badge ${f.severity === 'ALERT' ? 'badge-red' : 'badge-orange'}">${f.severity}</span></td>
    <td>${f.odoAtFlag?.toLocaleString() || '—'}</td>
    <td>${f.expectedOdo?.toLocaleString() || '—'}</td>
    <td>${f.discrepancyKm?.toLocaleString() || '—'}</td>
    <td>${f.reason || '—'}</td>
    <td>${formatDate(f.flagDate)}</td>
  </tr>`).join('');

  return `<!DOCTYPE html><html><head>${BASE_STYLES}</head><body>
${header}
<h1>Personal Use Flags Report — ${flags.length} Open Flags</h1>
<table>
  <thead><tr><th>Rego</th><th>Vehicle</th><th>Driver</th><th>Severity</th><th>Actual Odo</th><th>Expected Odo</th><th>Discrepancy (km)</th><th>Reason</th><th>Flagged</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer"><span>FINDEX Vehicle Fleet Dashboard</span><span>Page 1</span></div>
</body></html>`;
}

async function buildVehiclePDF(filters, user, prisma) {
  const { registration } = filters;
  if (!registration) throw new Error('Registration required for vehicle report');

  const vehicle = await prisma.vehicle.findUnique({
    where: { registration },
    include: {
      odometerReadings: { orderBy: { readingDate: 'desc' }, take: 5 },
      charges: { orderBy: { chargeDate: 'desc' }, take: 10 },
      personalUseFlags: { where: { resolved: false } },
    },
  });

  if (!vehicle) throw new Error('Vehicle not found');

  const dateStr = formatDate(new Date());
  const header = FINDEX_HEADER.replace('{{DATE}}', dateStr).replace('{{USER}}', user.name);

  const odoRows = vehicle.odometerReadings.map(r =>
    `<tr><td>${formatDate(r.readingDate)}</td><td>${r.readingKm.toLocaleString()} km</td><td>${r.source}</td><td>${r.notes || '—'}</td></tr>`
  ).join('');

  const chargeRows = vehicle.charges.map(c =>
    `<tr><td>${formatDate(c.chargeDate)}</td><td>${c.chargeType}</td><td>${c.description || '—'}</td><td>${formatCurrency(c.amountExGst)}</td><td>${formatCurrency(c.amountIncGst)}</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html><head>${BASE_STYLES}</head><body>
${header}
<h1>${vehicle.registration} — ${vehicle.make} ${vehicle.model} ${vehicle.variant || ''}</h1>
<table>
  <thead><tr><th colspan="4">Vehicle Details</th></tr></thead>
  <tbody>
    <tr><td><strong>Registration</strong></td><td>${vehicle.registration}</td><td><strong>VIN</strong></td><td>${vehicle.vin || '—'}</td></tr>
    <tr><td><strong>Make / Model</strong></td><td>${vehicle.make} ${vehicle.model}</td><td><strong>Year</strong></td><td>${vehicle.modelYear || '—'}</td></tr>
    <tr><td><strong>Driver</strong></td><td>${vehicle.driverName || 'Pool'}</td><td><strong>State</strong></td><td>${vehicle.state || '—'}</td></tr>
    <tr><td><strong>Contract Status</strong></td><td>${vehicle.contractStatus || '—'}</td><td><strong>Expiry</strong></td><td>${formatDate(vehicle.contractExpiryDate)}</td></tr>
    <tr><td><strong>Take Home</strong></td><td>${vehicle.takeHome ? 'Yes' : 'No'}</td><td><strong>Pool Car</strong></td><td>${vehicle.poolCar ? 'Yes' : 'No'}</td></tr>
  </tbody>
</table>
<h2>Odometer History</h2>
<table><thead><tr><th>Date</th><th>Reading</th><th>Source</th><th>Notes</th></tr></thead><tbody>${odoRows}</tbody></table>
<h2>Recent Charges</h2>
<table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Ex GST</th><th>Inc GST</th></tr></thead><tbody>${chargeRows}</tbody></table>
<div class="footer"><span>FINDEX Vehicle Fleet Dashboard</span><span>Page 1</span></div>
</body></html>`;
}

async function buildCostCentrePDF(filters, user, prisma) {
  const vehicles = await prisma.vehicle.findMany({ orderBy: { customerCostCentre: 'asc' } });
  const dateStr = formatDate(new Date());
  const header = FINDEX_HEADER.replace('{{DATE}}', dateStr).replace('{{USER}}', user.name);

  const byCostCentre = {};
  for (const v of vehicles) {
    const key = v.customerCostCentre || 'Unassigned';
    if (!byCostCentre[key]) byCostCentre[key] = { count: 0, monthlyLease: 0 };
    byCostCentre[key].count++;
    byCostCentre[key].monthlyLease += v.rentalInstallmentExGst || 0;
  }

  const rows = Object.entries(byCostCentre).map(([cc, data]) =>
    `<tr><td>${cc}</td><td>${data.count}</td><td>${formatCurrency(data.monthlyLease * 100)}/mo</td><td>${formatCurrency(data.monthlyLease * 1200)}/yr</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html><head>${BASE_STYLES}</head><body>
${header}
<h1>Cost Centre Summary Report</h1>
<table>
  <thead><tr><th>Cost Centre</th><th>Vehicles</th><th>Monthly Lease (ex GST)</th><th>Annual Lease (ex GST)</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer"><span>FINDEX Vehicle Fleet Dashboard</span><span>Page 1</span></div>
</body></html>`;
}

async function buildUsageLogPDF(filters, user, prisma) {
  const logs = await prisma.vehicleUsageLog.findMany({
    orderBy: { pickupDatetime: 'desc' },
    include: { vehicle: { select: { registration: true, make: true, model: true } } },
  });

  const dateStr = formatDate(new Date());
  const header = FINDEX_HEADER.replace('{{DATE}}', dateStr).replace('{{USER}}', user.name);

  const rows = logs.map(l => `<tr>
    <td>${l.vehicle.registration}</td>
    <td>${l.driverName}</td>
    <td>${l.purpose || '—'}</td>
    <td>${formatDate(l.pickupDatetime)}</td>
    <td>${formatDate(l.dropoffDatetime)}</td>
    <td>${l.tripKm ? l.tripKm.toLocaleString() + ' km' : '—'}</td>
    <td>${l.status}</td>
  </tr>`).join('');

  return `<!DOCTYPE html><html><head>${BASE_STYLES}</head><body>
${header}
<h1>Vehicle Usage Log — ${logs.length} Entries</h1>
<table>
  <thead><tr><th>Rego</th><th>Driver</th><th>Purpose</th><th>Pickup</th><th>Dropoff</th><th>Trip KM</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer"><span>FINDEX Vehicle Fleet Dashboard</span><span>Page 1</span></div>
</body></html>`;
}

module.exports = { generatePDF };
