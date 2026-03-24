const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const prisma = new PrismaClient();
const VALID_ROLES = ['admin', 'editor', 'viewer'];

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden', message: 'Admin access required', statusCode: 403 });
  }
  next();
}

// List all users
router.get('/', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, lastLogin: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// Create user
router.post('/', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { name, email, role, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'BadRequest', message: 'Name, email and password are required', statusCode: 400 });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'BadRequest', message: 'Role must be admin, editor or viewer', statusCode: 400 });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'BadRequest', message: 'Password must be at least 8 characters', statusCode: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(409).json({ error: 'Conflict', message: 'A user with that email already exists', statusCode: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase().trim(), role, passwordHash },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

// Update name / role
router.patch('/:id', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { name, role } = req.body;
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'BadRequest', message: 'Role must be admin, editor or viewer', statusCode: 400 });
    }

    // Prevent removing the last admin
    if (role && role !== 'admin') {
      const target = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (target?.role === 'admin') {
        const adminCount = await prisma.user.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'BadRequest', message: 'Cannot remove the last admin', statusCode: 400 });
        }
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (role) updates.role = role;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updates,
      select: { id: true, name: true, email: true, role: true, lastLogin: true, createdAt: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// Admin reset another user's password
router.post('/:id/reset-password', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'BadRequest', message: 'Password must be at least 8 characters', statusCode: 400 });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash: hash } });
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

// Delete user
router.delete('/:id', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'BadRequest', message: 'You cannot delete your own account', statusCode: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (target?.role === 'admin') {
      const adminCount = await prisma.user.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'BadRequest', message: 'Cannot delete the last admin', statusCode: 400 });
      }
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
