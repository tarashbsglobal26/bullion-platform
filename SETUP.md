# Bullion B2B Platform — Setup Guide

## Prerequisites

### 1. Install Node.js
Download Node.js v20 LTS from https://nodejs.org
After installing, restart PowerShell and verify:
```
node --version   # should be v20+
npm --version
```

### 2. Install PostgreSQL
Download from https://www.postgresql.org/download/windows/
Default: postgres user, localhost:5432
Or use a hosted service like Supabase (free tier available).

---

## Quick Start

```powershell
cd C:\Users\admin\bullion-platform

# 1. Install dependencies
npm install

# 2. Copy env and configure database
copy .env.example .env.local
# Edit .env.local: set DATABASE_URL to your PostgreSQL connection string

# 3. Create database & run migrations
npx prisma db push

# 4. Seed initial data (admin user + 6 products)
npm run db:seed

# 5. Start the dev server
npm run dev
```

Open http://localhost:3000
Login: admin@bullion.com / Admin@123!

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| DATABASE_URL | YES | PostgreSQL connection string |
| NEXTAUTH_SECRET | YES | Random secret (min 32 chars) |
| NEXTAUTH_URL | YES | App URL (http://localhost:3000 for dev) |
| TWELVE_DATA_API_KEY | YES | API key from twelvedata.com — used to fetch live gold/silver/platinum/palladium spot prices |

---

## Architecture

```
bullion-platform/
├── prisma/
│   └── schema.prisma          # Full DB schema
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login + Registration
│   │   ├── (dashboard)/       # All protected pages
│   │   │   ├── dashboard/     # KPI summary
│   │   │   ├── catalog/       # Product catalog + quoting
│   │   │   ├── quotes/        # Quote management
│   │   │   ├── orders/        # Order tracking
│   │   │   ├── inventory/     # Stock management (admin)
│   │   │   └── businesses/    # Business/KYC mgmt (admin)
│   │   └── api/               # REST API routes
│   ├── components/
│   │   ├── ui/                # Button, Card, Badge, Input
│   │   ├── layout/            # Sidebar with role-based nav
│   │   └── dashboard/         # SpotTicker live price bar
│   └── lib/
│       ├── prisma.ts           # Singleton Prisma client
│       ├── auth.ts             # NextAuth v5 config
│       ├── spot-prices.ts      # Metals API + cache + fallback
│       ├── invoice.ts          # PDF invoice generator
│       └── utils.ts            # Formatting helpers
```

## Key Features

### Live Spot Prices
- Polls gold-api.com (free, no key required) every 5 minutes
- Caches in memory + persists to DB
- Falls back to last DB value if API fails
- Live ticker banner shown on every page

### Quote → Order Flow
1. Buyer browses catalog (prices = spot × weight × (1 + premium))
2. Adds coins to cart → "Get Quote" locks spot prices for 30 min
3. Converts quote to order, providing shipping address
4. Order triggers auto-generated PDF invoice
5. Admin updates status: Confirmed → Processing → Shipped → Delivered

### KYC / Business Onboarding
1. Business registers via 3-step form
2. Status: PENDING_KYC → UNDER_REVIEW → VERIFIED
3. Document upload links to business record
4. Admin approves/rejects from Businesses page
5. Only VERIFIED businesses can request quotes

### Role-Based Access
| Role | Access |
|---|---|
| SUPER_ADMIN / ADMIN | Everything: inventory, businesses, all orders |
| BUSINESS_OWNER | Own business orders, quotes, catalog |
| BUYER | Catalog, quotes, orders for their business |

## Production Checklist
- [ ] Set strong NEXTAUTH_SECRET (32+ random chars)
- [ ] Use SSL DATABASE_URL
- [ ] Set TWELVE_DATA_API_KEY for live prices
- [ ] Configure file storage (S3/Cloudflare R2) for KYC docs
- [ ] Set up email (Resend/SendGrid) for notifications
- [ ] Run `npm run build` and verify no TypeScript errors
- [ ] Deploy to Vercel + Railway/Supabase
