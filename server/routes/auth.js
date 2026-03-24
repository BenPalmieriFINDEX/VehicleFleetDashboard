const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { loginLimiter } = require('../middleware/rateLimit');
const authMiddleware = require('../middleware/auth');

const prisma = new PrismaClient();
const EIGHT_HOURS = 8 * 60 * 60 * 1000;

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'BadRequest', message: 'Email and password required', statusCode: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials', statusCode: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials', statusCode: 401 });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: EIGHT_HOURS,
    });

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    next(err);
  }
});

// TEMPORARY diagnostics — remove after use
router.get('/temp-diag-xK9mQ2', (req, res) => {
  const url = process.env.DATABASE_URL || 'NOT SET';
  const masked = url.replace(/:\/\/[^@]+@/, '://***@');
  res.json({ databaseUrl: masked, nodeEnv: process.env.NODE_ENV });
});

// TEMPORARY one-time password reset — remove after use
router.get('/temp-reset-xK9mQ2', async (req, res, next) => {
  try {
    const hash = await bcrypt.hash('FINDEX2026!', 12);
    await prisma.user.update({
      where: { email: 'ben.palmieri@findex.com.au' },
      data: { passwordHash: hash },
    });
    res.send('Password reset successfully. Please log in and then ask to remove this endpoint.');
  } catch (e) {
    next(e);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

router.post('/change-password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'BadRequest', message: 'Current and new password required', statusCode: 400 });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'BadRequest', message: 'New password must be at least 8 characters', statusCode: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Current password is incorrect', statusCode: 401 });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: hash } });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
