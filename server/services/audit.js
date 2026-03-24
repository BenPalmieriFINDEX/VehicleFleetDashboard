const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function logAudit({ userId, action, entityType, entityId, oldValues, newValues, ipAddress }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write audit log:', err.message);
  }
}

module.exports = { logAudit };
