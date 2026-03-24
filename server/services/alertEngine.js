const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NZ_STATES = ['auckland', 'wellington', 'canterbury', 'otago', 'waikato', 'bay of plenty', 'manawatu', 'northland', 'southland', 'taranaki'];

async function runAlertEngine() {
  console.log('[AlertEngine] Running alert check...');

  const now = new Date();
  const in7 = new Date(); in7.setDate(in7.getDate() + 7);
  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const in90 = new Date(); in90.setDate(in90.getDate() + 90);
  const staleDate = new Date(); staleDate.setDate(staleDate.getDate() - 90);

  const settings = await prisma.appSettings.findUnique({ where: { id: 'settings' } });
  const staleDays = settings?.staleOdometerDays || 90;
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - staleDays);

  let created = 0;

  // Clear old unresolved alerts before refreshing
  await prisma.alert.deleteMany({
    where: { alertType: { in: ['CONTRACT_EXPIRING_7', 'CONTRACT_EXPIRING_30', 'REGISTRATION_DUE', 'STALE_ODOMETER'] } },
  });

  // Contracts expiring in 7 days
  const expiring7 = await prisma.vehicle.findMany({
    where: { contractExpiryDate: { gte: now, lte: in7 }, contractStatus: 'Active' },
  });
  for (const v of expiring7) {
    const days = Math.floor((new Date(v.contractExpiryDate) - now) / (1000 * 60 * 60 * 24));
    await prisma.alert.create({
      data: {
        alertType: 'CONTRACT_EXPIRING_7',
        vehicleId: v.id,
        title: `Contract expiring in ${days} day${days !== 1 ? 's' : ''}`,
        message: `${v.registration} (${v.make} ${v.model} — ${v.driverName || 'Pool'}) contract expires ${v.contractExpiryDate.toISOString().split('T')[0]}`,
        severity: 'HIGH',
      },
    });
    created++;
  }

  // Contracts expiring in 30 days (not already in 7)
  const expiring30 = await prisma.vehicle.findMany({
    where: { contractExpiryDate: { gt: in7, lte: in30 }, contractStatus: 'Active' },
  });
  for (const v of expiring30) {
    const days = Math.floor((new Date(v.contractExpiryDate) - now) / (1000 * 60 * 60 * 24));
    await prisma.alert.create({
      data: {
        alertType: 'CONTRACT_EXPIRING_30',
        vehicleId: v.id,
        title: `Contract expiring in ${days} days`,
        message: `${v.registration} (${v.make} ${v.model} — ${v.driverName || 'Pool'}) contract expires ${v.contractExpiryDate.toISOString().split('T')[0]}`,
        severity: 'MEDIUM',
      },
    });
    created++;
  }

  // Registration renewals due within 30 days
  const regosDue = await prisma.vehicle.findMany({
    where: { registrationPlateRenewalDate: { gte: now, lte: in30 } },
  });
  for (const v of regosDue) {
    const days = Math.floor((new Date(v.registrationPlateRenewalDate) - now) / (1000 * 60 * 60 * 24));
    await prisma.alert.create({
      data: {
        alertType: 'REGISTRATION_DUE',
        vehicleId: v.id,
        title: `Registration renewal due in ${days} day${days !== 1 ? 's' : ''}`,
        message: `${v.registration} (${v.make} ${v.model}) registration renewal due ${v.registrationPlateRenewalDate.toISOString().split('T')[0]}`,
        severity: days <= 7 ? 'HIGH' : 'MEDIUM',
      },
    });
    created++;
  }

  // Stale odometer — take home vehicles with no reading in X days
  const takeHomeVehicles = await prisma.vehicle.findMany({
    where: { takeHome: true },
    include: { odometerReadings: { orderBy: { readingDate: 'desc' }, take: 1 } },
  });

  for (const v of takeHomeVehicles) {
    const latest = v.odometerReadings[0];
    if (!latest || latest.readingDate < staleThreshold) {
      await prisma.alert.create({
        data: {
          alertType: 'STALE_ODOMETER',
          vehicleId: v.id,
          title: 'Stale odometer data',
          message: `${v.registration} (${v.make} ${v.model} — ${v.driverName || 'Unknown'}) has no odometer reading in the last ${staleDays} days`,
          severity: 'LOW',
        },
      });
      created++;
    }
  }

  console.log(`[AlertEngine] Created ${created} alerts`);
  return { created };
}

module.exports = { runAlertEngine };
