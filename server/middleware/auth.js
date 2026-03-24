/**
 * Auth middleware — isolated here so Cloudflare Access or another
 * external auth layer can be dropped in later without touching routes.
 *
 * To add Cloudflare Access in future:
 * 1. Verify the CF-Access-Jwt-Assertion header using Cloudflare's JWKS endpoint
 * 2. Extract the email claim and look up the user in the DB
 * 3. Attach user to req.user as below
 */
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function authMiddleware(req, res, next) {
  try {
    // Support both cookie and Authorization header
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'No token provided', statusCode: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not found', statusCode: 401 });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized', message: 'Token expired', statusCode: 401 });
    }
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token', statusCode: 401 });
  }
}

module.exports = authMiddleware;
