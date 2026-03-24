#!/usr/bin/env node
/**
 * Reset a user's password from the command line.
 * Usage: node server/scripts/resetPassword.js <email> <newPassword>
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const [,, email, newPassword] = process.argv;

if (!email || !newPassword) {
  console.error('Usage: node server/scripts/resetPassword.js <email> <newPassword>');
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });

  console.log(`Password reset successfully for ${user.name} <${user.email}>`);
}

main()
  .catch(e => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
