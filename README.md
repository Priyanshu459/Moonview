# Moonview

Premium Netflix-style streaming platform. Self-hosted on Oracle Cloud Free Tier.

## Stack

- **Frontend**: React 19 + Vite + TypeScript + React Router + TanStack Query
- **Backend**: Node.js + Express 5 + TypeScript + Prisma + PostgreSQL
- **Processing**: FFmpeg (HLS, thumbnails, transcoding)
- **Auth**: JWT + HTTP-only cookies + Argon2
- **Jobs**: BullMQ + Redis
- **Proxy**: Nginx + Cloudflare

## Monorepo Structure

```
moonview/
├── frontend/      # React 19 + Vite UI
├── backend/       # Express 5 API + Prisma
├── shared/        # Shared TypeScript types
├── infra/         # Nginx, Docker, deploy scripts
└── docs/          # Architecture documentation
```

## Quick Start (Development)

### Prerequisites
- Node.js >= 22
- PostgreSQL 17 running locally
- Redis (for job queue — Phase 6+)

### Setup

```bash
# Install all dependencies
npm install

# Copy environment files
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate:dev

# Seed initial admin user
npm run db:seed

# Start backend dev server
npm run dev:backend

# Start frontend dev server (new terminal)
npm run dev:frontend
```

### Database Commands

```bash
# Create and apply a new migration
npm run db:migrate:dev -- --name <migration-name>

# Apply pending migrations (production)
npm run db:migrate

# Generate Prisma client after schema changes
npm run db:generate

# Seed database (creates admin user from .env)
npm run db:seed

# Reset database (WARNING: deletes all data)
npm run db:reset

# Open Prisma Studio (database GUI)
npm run db:studio
```

### Build

```bash
# Build all packages
npm run build

# Type check all packages
npm run typecheck
```

## Environment Variables

See `backend/.env.example` for all required variables.

**Never commit `.env` files.**

## Architecture

See `docs/` for detailed architecture documentation.
