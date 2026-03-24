# FINDEX Vehicle Fleet Dashboard

A production-ready Vehicle Fleet Management Dashboard for FINDEX, replacing an Excel-based fleet management process. Built on React + Node.js + PostgreSQL with Prisma ORM.

---

## Features

- **Fleet Register** — Full searchable, filterable vehicle register (AU + NZ)
- **Vehicle Detail** — 7-tab detail page per vehicle (info, contract, assignment, odometer, charges, notes, usage log)
- **Personal Use Monitor** — Odometer discrepancy tracking for Take Home vehicles
- **Contracts & Renewals** — Traffic-light contract expiry dashboard
- **Cost Centre Reporting** — Fleet costs grouped by cost centre, state, charge type
- **AI Fleet Assistant** — Claude-powered fleet Q&A with live data context
- **Alerts & Notifications** — Proactive contract expiry, registration, stale odometer alerts
- **Vehicle Usage Log** — Staff vehicle usage tracking with "Mark Returned" workflow
- **Import System** — SG Fleet CSV/Excel import + account statement import (Excel & PDF)
- **PDF Export** — Puppeteer-based branded PDF exports for all major reports
- **JWT Auth** — Secure login with httpOnly cookie, 8h session, 5 req/min rate limiting

---

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- pnpm or npm

### 1. Clone and install

```bash
git clone https://github.com/BenPalmieriFINDEX/VehicleFleetDashboard.git
cd VehicleFleetDashboard
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/findex_fleet"
JWT_SECRET="your-very-long-random-secret"
COOKIE_SECRET="another-random-secret"
ANTHROPIC_API_KEY="sk-ant-..."
NODE_ENV="development"
PORT=3001
```

### 3. Set up the database

```bash
cd server
npx prisma migrate dev --name init
node prisma/seed.js
```

> **Important:** The seed script prints generated passwords to the console. Save them — they are not stored anywhere.

### 4. Run in development

```bash
# From root directory — runs server (port 3001) and client (port 5173) concurrently
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:3001/api

---

## Railway Deployment

### 1. Create a new Railway project

```bash
railway new
```

### 2. Add a PostgreSQL service

In the Railway dashboard, add a PostgreSQL plugin to your project. Railway will automatically set `DATABASE_URL`.

### 3. Set environment variables

In the Railway dashboard, add:

| Variable | Value |
|---|---|
| `JWT_SECRET` | Long random string (use `openssl rand -hex 64`) |
| `COOKIE_SECRET` | Another random string |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `NODE_ENV` | `production` |

### 4. Deploy

```bash
railway up
```

The `railway.toml` configures the build and start commands automatically:
- **Build:** `npm install && cd client && npm install && npm run build`
- **Start:** `node server/index.js`
- **Health check:** `GET /api/health`

### 5. Run migrations on Railway

```bash
railway run npx prisma migrate deploy
railway run node server/prisma/seed.js
```

---

## Project Structure

```
/
├── client/                    # React frontend (Vite + Tailwind)
│   └── src/
│       ├── components/        # Layout, Badge, Modal, Skeleton, etc.
│       ├── context/           # AuthContext
│       ├── hooks/             # useAlertCount
│       ├── pages/             # Dashboard, Fleet, VehicleDetail, etc.
│       ├── styles/            # Tailwind + custom CSS
│       └── utils/             # api.js, format.js
├── server/
│   ├── middleware/            # auth.js, rateLimit.js, errorHandler.js
│   ├── prisma/
│   │   ├── schema.prisma      # Full database schema
│   │   └── seed.js            # Seed users, vehicles, sample data
│   ├── routes/                # One file per resource
│   ├── services/              # ai.js, pdf.js, fileParser.js, alertEngine.js, audit.js
│   └── index.js               # Express app entry point
├── railway.toml
├── .env.example
└── README.md
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | JWT signing secret (min 32 chars) |
| `COOKIE_SECRET` | ✅ | Cookie signing secret |
| `ANTHROPIC_API_KEY` | ✅ | Claude API key for AI assistant |
| `NODE_ENV` | ✅ | `development` or `production` |
| `PORT` | Optional | Server port (default: 3001) |
| `RATE_LIMIT_WINDOW_MS` | Optional | Rate limit window in ms (default: 60000) |
| `RATE_LIMIT_MAX` | Optional | Max requests per window (default: 5) |

---

## Default Users (Seeded)

Three users are created on first seed. **Passwords are printed to console and never stored in plaintext.**

| Name | Email | Role |
|---|---|---|
| Ben Palmieri | ben.palmieri@findex.com.au | admin |
| Dillon Maikousis | dillon.maikousis@findex.com.au | admin |
| Mario Koulloupas | mario.koulloupas@findex.com.au | admin |

---

## Future: Adding Cloudflare Access

The auth middleware is isolated in `server/middleware/auth.js` specifically to make this upgrade straightforward.

### Steps to add Cloudflare Access

1. **Set up Cloudflare Access** on your Railway domain in the Cloudflare Zero Trust dashboard
2. **Get the JWKS endpoint** from Cloudflare Access: `https://<your-team>.cloudflareaccess.com/cdn-cgi/access/certs`
3. **Install the Cloudflare JWT library:**
   ```bash
   npm install jwks-rsa jsonwebtoken
   ```
4. **Update `server/middleware/auth.js`** to verify the `CF-Access-Jwt-Assertion` header:
   ```js
   const jwksClient = require('jwks-rsa');
   const client = jwksClient({ jwksUri: 'https://<team>.cloudflareaccess.com/cdn-cgi/access/certs' });

   async function authMiddleware(req, res, next) {
     const cfJwt = req.headers['cf-access-jwt-assertion'];
     if (cfJwt) {
       // Verify CF JWT, extract email claim, look up user by email
       const decoded = await verifyCfJwt(cfJwt);
       req.user = await prisma.user.findUnique({ where: { email: decoded.email } });
       return next();
     }
     // Fall back to internal JWT for local dev
     // ... existing JWT logic
   }
   ```
5. **No route changes needed** — all routes use `authMiddleware` through the same import
6. **Remove login rate limiter** from `server/routes/auth.js` once CF Access is the primary auth gate

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, TanStack Query 5 |
| Styling | Tailwind CSS with FINDEX brand tokens |
| Charts | Recharts |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (httpOnly cookie), bcryptjs |
| AI | Anthropic Claude (claude-sonnet-4-20250514) |
| PDF | Puppeteer |
| File Parsing | SheetJS (xlsx), pdf-parse |
| Notifications | react-hot-toast |
| Hosting | Railway |
