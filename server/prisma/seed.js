const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const USERS = [
  {
    name: 'Ben Palmieri',
    email: 'ben.palmieri@findex.com.au',
    role: 'admin',
  },
  {
    name: 'Dillon Maikousis',
    email: 'dillon.maikousis@findex.com.au',
    role: 'admin',
  },
  {
    name: 'Mario Koulloupas',
    email: 'mario.koulloupas@findex.com.au',
    role: 'admin',
  },
];

// NZ states for country derivation
const NZ_STATES = [
  'auckland', 'wellington', 'canterbury', 'otago', 'waikato',
  'bay of plenty', 'manawatu', 'northland', 'southland', 'taranaki',
  'hawke\'s bay', 'nelson', 'marlborough', 'west coast', 'gisborne',
  'tasman', 'new zealand', 'nz',
];

function deriveCountry(state) {
  if (!state) return 'AU';
  return NZ_STATES.includes(state.toLowerCase()) ? 'NZ' : 'AU';
}

function generatePassword(length = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

const SAMPLE_VEHICLES = [
  {
    registration: 'ABC123',
    contractRef: 'SG-2024-001',
    make: 'Toyota',
    model: 'Camry',
    variant: 'Ascent Sport',
    modelYear: 2023,
    assetClass: 'Passenger',
    transmissionType: 'Automatic',
    bodyType: 'Sedan',
    colour: 'White',
    driveType: 'FWD',
    state: 'VIC',
    country: 'AU',
    engineType: 'Petrol',
    fuelType: 'Petrol',
    co2Emissions: 156,
    vin: 'JTDBE20K900123456',
    tareKg: 1520,
    gvmKg: 1995,
    company: 'FINDEX',
    customerCostCentre: 'CC-001',
    location: 'Melbourne CBD',
    takeHome: true,
    contractTerm: 36,
    dateInService: new Date('2023-01-15'),
    contractStatus: 'Active',
    contractStartDate: new Date('2023-01-15'),
    contractExpiryDate: new Date('2026-01-15'),
    contractDistance: 45000,
    driverName: 'James Wilson',
    poolCar: false,
    productDescription: 'Novated Lease',
    purchaseDate: new Date('2023-01-10'),
    registrationPlateRenewalDate: new Date('2025-09-30'),
    rentalInstallmentExGst: 850.00,
    excessKmRate: 0.12,
    contractEndKms: 45000,
    fbtBaseValue: 42500,
    fbtExempt: false,
    fbtOpeningOdo: 100,
    selectedFbtMethod: 'Operating Cost',
    annualisedKms: 15000,
    vehicleId: 'VH-001',
    fuelTankCapacity: 60,
    starRating: 5,
    ancapRating: 5,
    inventoryStatus: 'Active',
    countryOfManufacture: 'Japan',
    financier: 'SG Fleet',
    driverEmailAddress: 'james.wilson@findex.com.au',
    driverMobilePhone: '0412 345 678',
    level1: 'Corporate',
    level2: 'Operations',
    level3: 'Fleet',
  },
  {
    registration: 'DEF456',
    contractRef: 'SG-2024-002',
    make: 'Mazda',
    model: 'CX-5',
    variant: 'Touring',
    modelYear: 2023,
    assetClass: 'SUV',
    transmissionType: 'Automatic',
    bodyType: 'SUV',
    colour: 'Grey',
    driveType: 'AWD',
    state: 'NSW',
    country: 'AU',
    engineType: 'Petrol',
    fuelType: 'Petrol',
    co2Emissions: 178,
    vin: 'JM3KFACL9L0123456',
    tareKg: 1690,
    gvmKg: 2175,
    company: 'FINDEX',
    customerCostCentre: 'CC-002',
    location: 'Sydney CBD',
    takeHome: true,
    contractTerm: 48,
    dateInService: new Date('2022-07-01'),
    contractStatus: 'Active',
    contractStartDate: new Date('2022-07-01'),
    contractExpiryDate: new Date('2025-07-01'),
    contractDistance: 60000,
    driverName: 'Sarah Chen',
    poolCar: false,
    productDescription: 'Novated Lease',
    purchaseDate: new Date('2022-06-20'),
    registrationPlateRenewalDate: new Date('2025-06-30'),
    rentalInstallmentExGst: 920.00,
    excessKmRate: 0.14,
    contractEndKms: 60000,
    fbtBaseValue: 47900,
    fbtExempt: false,
    fbtOpeningOdo: 250,
    selectedFbtMethod: 'Statutory',
    annualisedKms: 15000,
    vehicleId: 'VH-002',
    fuelTankCapacity: 56,
    starRating: 5,
    ancapRating: 5,
    inventoryStatus: 'Active',
    countryOfManufacture: 'Japan',
    financier: 'SG Fleet',
    driverEmailAddress: 'sarah.chen@findex.com.au',
    driverMobilePhone: '0423 456 789',
    level1: 'Corporate',
    level2: 'Finance',
    level3: 'Fleet',
  },
  {
    registration: 'GHI789',
    contractRef: 'SG-2024-003',
    make: 'Ford',
    model: 'Ranger',
    variant: 'XLT',
    modelYear: 2022,
    assetClass: 'Ute',
    transmissionType: 'Automatic',
    bodyType: 'Ute',
    colour: 'Black',
    driveType: '4WD',
    state: 'QLD',
    country: 'AU',
    engineType: 'Diesel',
    fuelType: 'Diesel',
    co2Emissions: 195,
    vin: '6FPAAAJGXMGA12345',
    tareKg: 2160,
    gvmKg: 3200,
    company: 'FINDEX',
    customerCostCentre: 'CC-003',
    location: 'Brisbane',
    takeHome: false,
    contractTerm: 36,
    dateInService: new Date('2022-03-01'),
    contractStatus: 'Active',
    contractStartDate: new Date('2022-03-01'),
    contractExpiryDate: new Date('2025-05-15'),
    contractDistance: 54000,
    driverName: 'Pool Vehicle',
    poolCar: true,
    productDescription: 'Operating Lease',
    purchaseDate: new Date('2022-02-20'),
    registrationPlateRenewalDate: new Date('2025-02-28'),
    rentalInstallmentExGst: 1100.00,
    excessKmRate: 0.16,
    contractEndKms: 54000,
    fbtBaseValue: 58900,
    fbtExempt: true,
    annualisedKms: 18000,
    vehicleId: 'VH-003',
    fuelTankCapacity: 80,
    starRating: 5,
    ancapRating: 5,
    inventoryStatus: 'Active',
    countryOfManufacture: 'Thailand',
    financier: 'SG Fleet',
    level1: 'Corporate',
    level2: 'Operations',
    level3: 'Fleet',
  },
  {
    registration: 'JKL012',
    contractRef: 'SG-2024-004',
    make: 'Hyundai',
    model: 'Tucson',
    variant: 'Elite',
    modelYear: 2024,
    assetClass: 'SUV',
    transmissionType: 'Automatic',
    bodyType: 'SUV',
    colour: 'Blue',
    driveType: 'AWD',
    state: 'WA',
    country: 'AU',
    engineType: 'Petrol',
    fuelType: 'Petrol',
    co2Emissions: 165,
    vin: 'KM8J3CA21NU123456',
    tareKg: 1600,
    gvmKg: 2075,
    company: 'FINDEX',
    customerCostCentre: 'CC-004',
    location: 'Perth',
    takeHome: true,
    contractTerm: 36,
    dateInService: new Date('2024-01-10'),
    contractStatus: 'Active',
    contractStartDate: new Date('2024-01-10'),
    contractExpiryDate: new Date('2027-01-10'),
    contractDistance: 45000,
    driverName: 'Michael Thompson',
    poolCar: false,
    productDescription: 'Novated Lease',
    purchaseDate: new Date('2024-01-05'),
    registrationPlateRenewalDate: new Date('2025-12-31'),
    rentalInstallmentExGst: 890.00,
    excessKmRate: 0.13,
    contractEndKms: 45000,
    fbtBaseValue: 44900,
    fbtExempt: false,
    annualisedKms: 15000,
    vehicleId: 'VH-004',
    fuelTankCapacity: 54,
    starRating: 5,
    ancapRating: 5,
    inventoryStatus: 'Active',
    countryOfManufacture: 'South Korea',
    financier: 'SG Fleet',
    driverEmailAddress: 'michael.thompson@findex.com.au',
    level1: 'Corporate',
    level2: 'Advisory',
    level3: 'Fleet',
  },
  {
    registration: 'MNO345',
    contractRef: 'SG-2024-005',
    make: 'Toyota',
    model: 'HiLux',
    variant: 'SR5+',
    modelYear: 2023,
    assetClass: 'Ute',
    transmissionType: 'Automatic',
    bodyType: 'Ute',
    colour: 'White',
    driveType: '4WD',
    state: 'SA',
    country: 'AU',
    engineType: 'Diesel',
    fuelType: 'Diesel',
    co2Emissions: 208,
    vin: 'MR0GX3FB70N123456',
    tareKg: 2190,
    gvmKg: 3065,
    company: 'FINDEX',
    customerCostCentre: 'CC-005',
    location: 'Adelaide',
    takeHome: false,
    contractTerm: 48,
    dateInService: new Date('2023-06-01'),
    contractStatus: 'Active',
    contractStartDate: new Date('2023-06-01'),
    contractExpiryDate: new Date('2025-06-01'),
    contractDistance: 72000,
    driverName: 'Pool Vehicle',
    poolCar: true,
    productDescription: 'Operating Lease',
    purchaseDate: new Date('2023-05-25'),
    registrationPlateRenewalDate: new Date('2025-05-31'),
    rentalInstallmentExGst: 1150.00,
    excessKmRate: 0.17,
    contractEndKms: 72000,
    fbtBaseValue: 62500,
    fbtExempt: true,
    annualisedKms: 18000,
    vehicleId: 'VH-005',
    fuelTankCapacity: 80,
    starRating: 5,
    ancapRating: 5,
    inventoryStatus: 'Active',
    countryOfManufacture: 'Thailand',
    financier: 'SG Fleet',
    level1: 'Corporate',
    level2: 'Operations',
    level3: 'Fleet',
  },
  {
    registration: 'PQR678',
    contractRef: 'SG-2023-006',
    make: 'Mitsubishi',
    model: 'Outlander',
    variant: 'Exceed PHEV',
    modelYear: 2022,
    assetClass: 'SUV',
    transmissionType: 'CVT',
    bodyType: 'SUV',
    colour: 'Red',
    driveType: 'AWD',
    state: 'ACT',
    country: 'AU',
    engineType: 'Hybrid',
    fuelType: 'PHEV',
    co2Emissions: 45,
    vin: 'JA4AD3A38MZ123456',
    tareKg: 1890,
    gvmKg: 2365,
    company: 'FINDEX',
    customerCostCentre: 'CC-006',
    location: 'Canberra',
    takeHome: true,
    contractTerm: 36,
    dateInService: new Date('2022-10-01'),
    contractStatus: 'Active',
    contractStartDate: new Date('2022-10-01'),
    contractExpiryDate: new Date('2025-10-01'),
    contractDistance: 45000,
    driverName: 'Emma Roberts',
    poolCar: false,
    productDescription: 'Novated Lease',
    purchaseDate: new Date('2022-09-20'),
    registrationPlateRenewalDate: new Date('2025-09-30'),
    rentalInstallmentExGst: 980.00,
    excessKmRate: 0.13,
    contractEndKms: 45000,
    fbtBaseValue: 52900,
    fbtExempt: false,
    annualisedKms: 15000,
    vehicleId: 'VH-006',
    fuelTankCapacity: 45,
    starRating: 5,
    ancapRating: 5,
    inventoryStatus: 'Active',
    countryOfManufacture: 'Japan',
    financier: 'SG Fleet',
    driverEmailAddress: 'emma.roberts@findex.com.au',
    level1: 'Corporate',
    level2: 'Technology',
    level3: 'Fleet',
  },
  {
    registration: 'NZ001',
    contractRef: 'SG-NZ-001',
    make: 'Toyota',
    model: 'RAV4',
    variant: 'GXL',
    modelYear: 2023,
    assetClass: 'SUV',
    transmissionType: 'Automatic',
    bodyType: 'SUV',
    colour: 'Silver',
    driveType: 'AWD',
    state: 'Auckland',
    country: 'NZ',
    engineType: 'Petrol',
    fuelType: 'Petrol',
    co2Emissions: 162,
    vin: 'JTMH33FV00D123456',
    company: 'FINDEX NZ',
    customerCostCentre: 'NZ-CC-001',
    location: 'Auckland CBD',
    takeHome: false,
    contractTerm: 36,
    dateInService: new Date('2023-04-01'),
    contractStatus: 'Active',
    contractStartDate: new Date('2023-04-01'),
    contractExpiryDate: new Date('2026-04-01'),
    contractDistance: 54000,
    driverName: 'Pool Vehicle',
    poolCar: true,
    productDescription: 'Operating Lease',
    purchaseDate: new Date('2023-03-25'),
    registrationPlateRenewalDate: new Date('2025-03-31'),
    rentalInstallmentExGst: 900.00,
    excessKmRate: 0.13,
    annualisedKms: 18000,
    vehicleId: 'VH-NZ-001',
    fuelTankCapacity: 55,
    starRating: 5,
    countryOfManufacture: 'Japan',
    financier: 'SG Fleet NZ',
    level1: 'New Zealand',
    level2: 'Operations',
    level3: 'Fleet',
  },
  {
    registration: 'STU901',
    contractRef: 'SG-2023-007',
    make: 'Kia',
    model: 'Sportage',
    variant: 'GT-Line',
    modelYear: 2023,
    assetClass: 'SUV',
    transmissionType: 'Automatic',
    bodyType: 'SUV',
    colour: 'White',
    driveType: 'FWD',
    state: 'VIC',
    country: 'AU',
    engineType: 'Petrol',
    fuelType: 'Petrol',
    co2Emissions: 172,
    vin: 'KNAPB81CP9K123456',
    company: 'FINDEX',
    customerCostCentre: 'CC-007',
    location: 'Melbourne CBD',
    takeHome: true,
    contractTerm: 36,
    dateInService: new Date('2023-08-01'),
    contractStatus: 'Active',
    contractStartDate: new Date('2023-08-01'),
    contractExpiryDate: new Date('2026-08-01'),
    contractDistance: 45000,
    driverName: 'David Park',
    poolCar: false,
    productDescription: 'Novated Lease',
    rentalInstallmentExGst: 870.00,
    excessKmRate: 0.12,
    contractEndKms: 45000,
    fbtBaseValue: 43500,
    fbtExempt: false,
    annualisedKms: 15000,
    vehicleId: 'VH-007',
    fuelTankCapacity: 54,
    starRating: 5,
    countryOfManufacture: 'South Korea',
    financier: 'SG Fleet',
    driverEmailAddress: 'david.park@findex.com.au',
    level1: 'Corporate',
    level2: 'Accounting',
    level3: 'Fleet',
  },
];

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Create app settings
  await prisma.appSettings.upsert({
    where: { id: 'settings' },
    update: {},
    create: {
      id: 'settings',
      discrepancyThresholdPct: 10,
      contractExpiryWarningDays: 90,
      staleOdometerDays: 90,
    },
  });

  // Create users
  const createdUsers = [];
  console.log('👤 Creating users...');
  for (const userData of USERS) {
    const password = process.env.SEED_PASSWORD || 'Findex2024!';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: { passwordHash, name: userData.name },
      create: {
        ...userData,
        passwordHash,
      },
    });
    createdUsers.push(user);
    console.log(`   ✓ ${user.name} <${user.email}> — password: ${password}`);
  }

  console.log('\n🚗 Creating vehicles...');
  const createdVehicles = [];
  for (const vehicleData of SAMPLE_VEHICLES) {
    const vehicle = await prisma.vehicle.upsert({
      where: { registration: vehicleData.registration },
      update: vehicleData,
      create: vehicleData,
    });
    createdVehicles.push(vehicle);
    console.log(`   ✓ ${vehicle.registration} — ${vehicle.make} ${vehicle.model}`);
  }

  // Create odometer readings
  console.log('\n📏 Creating odometer readings...');
  const adminUser = createdUsers[0];
  for (const vehicle of createdVehicles) {
    if (!vehicle.dateInService) continue;
    const baseDate = new Date(vehicle.dateInService);
    const annualKms = vehicle.annualisedKms || 15000;

    for (let i = 0; i < 3; i++) {
      const daysOffset = Math.floor((i + 1) * 120);
      const readingDate = new Date(baseDate);
      readingDate.setDate(readingDate.getDate() + daysOffset);

      if (readingDate > new Date()) break;

      const readingKm = (vehicle.fbtOpeningOdo || 0) + Math.floor((annualKms / 365) * daysOffset);

      await prisma.odometerReading.create({
        data: {
          vehicleId: vehicle.id,
          readingKm,
          readingDate,
          source: 'IMPORT',
          notes: 'Seed data reading',
          createdById: adminUser.id,
        },
      });
    }
  }
  console.log('   ✓ Odometer readings created');

  // Create personal use flags for take-home vehicles
  console.log('\n🚨 Creating sample personal use flags...');
  const takeHomeVehicles = createdVehicles.filter(v => v.takeHome);
  for (let i = 0; i < Math.min(2, takeHomeVehicles.length); i++) {
    const vehicle = takeHomeVehicles[i];
    const annualKms = vehicle.annualisedKms || 15000;
    const daysSinceService = vehicle.dateInService
      ? Math.floor((new Date() - new Date(vehicle.dateInService)) / (1000 * 60 * 60 * 24))
      : 365;
    const expectedOdo = Math.floor((annualKms / 365) * daysSinceService);
    const actualOdo = Math.floor(expectedOdo * 1.18); // 18% over = ALERT
    const discrepancy = actualOdo - expectedOdo;

    await prisma.personalUseFlag.create({
      data: {
        vehicleId: vehicle.id,
        flagDate: new Date(),
        flaggedById: adminUser.id,
        reason: 'Odometer reading significantly exceeds expected kilometres for contract period',
        odoAtFlag: actualOdo,
        expectedOdo,
        discrepancyKm: discrepancy,
        severity: 'ALERT',
        resolved: false,
      },
    });
    console.log(`   ✓ Flag created for ${vehicle.registration}`);
  }

  // Create sample alerts
  console.log('\n🔔 Creating sample alerts...');
  const expiringVehicles = createdVehicles.filter(v => {
    if (!v.contractExpiryDate) return false;
    const days = Math.floor((new Date(v.contractExpiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days <= 90 && days > 0;
  });

  for (const vehicle of expiringVehicles) {
    const days = Math.floor((new Date(vehicle.contractExpiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    await prisma.alert.create({
      data: {
        alertType: 'CONTRACT_EXPIRING',
        vehicleId: vehicle.id,
        title: `Contract expiring in ${days} days`,
        message: `${vehicle.registration} (${vehicle.make} ${vehicle.model}) contract expires on ${vehicle.contractExpiryDate.toISOString().split('T')[0]}`,
        severity: days <= 30 ? 'HIGH' : 'MEDIUM',
      },
    });
  }
  console.log(`   ✓ ${expiringVehicles.length} contract expiry alerts created`);

  // Sample usage log entries
  console.log('\n📋 Creating sample usage log entries...');
  const sampleVehicle = createdVehicles[0];
  await prisma.vehicleUsageLog.create({
    data: {
      vehicleId: sampleVehicle.id,
      loggedById: adminUser.id,
      driverName: 'James Wilson',
      purpose: 'Client visit — Melbourne CBD',
      pickupDatetime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      dropoffDatetime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      pickupOdometer: 12500,
      dropoffOdometer: 12645,
      tripKm: 145,
      status: 'COMPLETED',
    },
  });

  await prisma.vehicleUsageLog.create({
    data: {
      vehicleId: createdVehicles[1].id,
      loggedById: adminUser.id,
      driverName: 'Sarah Chen',
      purpose: 'Airport pickup — SYD',
      pickupDatetime: new Date(Date.now() - 3 * 60 * 60 * 1000),
      status: 'ACTIVE',
      pickupOdometer: 28900,
    },
  });
  console.log('   ✓ Usage log entries created');

  console.log('\n✅ Seed complete!');
  console.log('\n⚠️  IMPORTANT: Save the passwords above — they will not be shown again.\n');
}

main()
  .catch(e => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
