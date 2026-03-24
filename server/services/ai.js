const Anthropic = require('@anthropic-ai/sdk');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getFleetContext() {
  const [
    totalVehicles, activeContracts, openFlags,
    expiring90, expiringVehicles, recentImports,
  ] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { contractStatus: 'Active' } }),
    prisma.personalUseFlag.count({ where: { resolved: false } }),
    prisma.vehicle.count({
      where: {
        contractExpiryDate: { gte: new Date(), lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
        contractStatus: 'Active',
      },
    }),
    prisma.vehicle.findMany({
      where: {
        contractExpiryDate: { gte: new Date(), lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
        contractStatus: 'Active',
      },
      select: { registration: true, make: true, model: true, contractExpiryDate: true, driverName: true },
      orderBy: { contractExpiryDate: 'asc' },
      take: 10,
    }),
    prisma.accountStatementImport.findMany({
      orderBy: { importDate: 'desc' },
      take: 5,
      select: { filename: true, importDate: true, rowCount: true, fyPeriod: true },
    }),
  ]);

  const expiringList = expiringVehicles.map(v =>
    `- ${v.registration} (${v.make} ${v.model}, ${v.driverName || 'Pool'}) expires ${v.contractExpiryDate?.toISOString().split('T')[0]}`
  ).join('\n');

  return `
FLEET CONTEXT (live data as of ${new Date().toISOString().split('T')[0]}):
- Total fleet size: ${totalVehicles} vehicles
- Active contracts: ${activeContracts}
- Open personal use flags: ${openFlags}
- Contracts expiring within 90 days: ${expiring90}

Contracts expiring soon:
${expiringList || 'None within 90 days'}

Recent imports: ${recentImports.map(i => `${i.filename} (${i.fyPeriod}, ${i.rowCount} rows)`).join(', ') || 'None'}
`.trim();
}

async function chatWithFleetAssistant(messages, user) {
  const context = await getFleetContext();

  const systemPrompt = `You are a fleet management assistant for FINDEX, an Australian financial services company. You have access to the company's vehicle fleet data including contracts, odometer readings, personal use flags, and cost summaries. Answer questions accurately and concisely. Flag anything that looks like a compliance or cost risk.

${context}

Today's date is ${new Date().toISOString().split('T')[0]}.
Current user: ${user.name} (${user.role})`;

  // Keep last 10 messages for context
  const recentMessages = messages.slice(-10);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: recentMessages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  });

  return response.content[0].text;
}

module.exports = { chatWithFleetAssistant };
