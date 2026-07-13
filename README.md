# SyncSpace

> Enterprise team collaboration platform — monorepo Phase 1 setup

SyncSpace is a full-stack, multi-tenant SaaS application for project management, kanban boards, real-time collaboration, and team communication. This repository contains the complete monorepo setup (Phase 1).

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running with Docker (Infrastructure Only)](#running-with-docker-infrastructure-only)
  - [Running Locally](#running-locally)
- [Development Workflow](#development-workflow)
  - [Scripts](#scripts)
  - [Code Quality](#code-quality)
  - [Git Hooks](#git-hooks)
- [Database](#database)
- [Delivery Roadmap](#delivery-roadmap)
- [Contributing](#contributing)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SyncSpace Monorepo                        │
│                                                                   │
│  ┌──────────────────┐        ┌──────────────────────────────┐   │
│  │   apps/web       │        │        apps/api              │   │
│  │  (Next.js 15)    │◄──────►│     (Express + TypeScript)   │   │
│  │  App Router      │  REST  │     Port 4000                │   │
│  │  Port 3000       │        │                              │   │
│  └──────────────────┘        └──────────┬───────────────────┘   │
│                                         │                         │
│  ┌──────────────────┐        ┌──────────▼───────────────────┐   │
│  │ packages/shared  │        │     Infrastructure            │   │
│  │ (Types, Schemas, │        │  ┌─────────┐  ┌──────────┐   │   │
│  │  Constants)      │        │  │Postgres │  │  Redis   │   │   │
│  └──────────────────┘        │  │ (Prisma)│  │ (ioredis)│   │   │
│                               │  └─────────┘  └──────────┘   │   │
│                               └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer       | Technology                      | Version    |
| ----------- | ------------------------------- | ---------- |
| Frontend    | Next.js (App Router)            | 15.x       |
| Backend     | Express                         | 4.x        |
| Language    | TypeScript (strict mode)        | 5.x        |
| Database    | PostgreSQL                      | 16.x       |
| ORM         | Prisma                          | 5.x        |
| Cache       | Redis (ioredis)                 | 7.x        |
| Styling     | Tailwind CSS + shadcn/ui        | 3.x        |
| Validation  | Zod                             | 3.x        |
| Logging     | Pino + pino-pretty              | 9.x        |
| Package Mgr | pnpm workspaces                 | 9.x        |
| Containers  | Docker + Docker Compose         | -          |
| Linting     | ESLint (flat config) + Prettier | 9.x / 3.x  |
| Git Hooks   | Husky + lint-staged             | 9.x / 15.x |
| CI          | GitHub Actions                  | -          |

---

## Monorepo Structure

```
syncspace/
├── .github/
│   └── workflows/
│       └── ci.yml              # Lint, typecheck, build
├── .husky/
│   └── pre-commit              # lint-staged on commit
├── apps/
│   ├── api/                    # Express backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Full data model
│   │   │   └── migrations/     # Migration history
│   │   └── src/
│   │       ├── config/
│   │       │   └── env.ts      # Zod-validated env vars
│   │       ├── core/
│   │       │   ├── errors/     # AppError, HttpErrors
│   │       │   └── result/     # Result<T, E> monad
│   │       ├── infrastructure/
│   │       │   ├── cache/      # Redis singleton
│   │       │   ├── database/   # Prisma singleton
│   │       │   └── logger/     # Pino logger
│   │       ├── middlewares/    # Error, 404, rate-limit, request-log
│   │       ├── modules/
│   │       │   └── health/     # GET /api/v1/health
│   │       ├── routes/         # Router assembly
│   │       └── server.ts       # Express app + graceful shutdown
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/
│           │   ├── (auth)/     # Auth route group (Phase 2)
│           │   ├── (dashboard)/# Dashboard route group (Phase 3)
│           │   ├── globals.css # Tailwind + shadcn CSS variables
│           │   ├── layout.tsx  # Root layout (Geist fonts, metadata)
│           │   └── page.tsx    # Placeholder landing page
│           ├── lib/
│           │   ├── api-client.ts # Axios instance + interceptors
│           │   └── utils.ts      # cn(), formatters
│           ├── providers/      # React Query, theme providers
│           └── types/          # Shared TypeScript types
├── packages/
│   └── shared/                 # @syncspace/shared
│       └── src/
│           ├── constants/      # App-wide constants
│           ├── schemas/        # Zod schemas (API contract)
│           └── types/          # Shared TypeScript types
├── docker-compose.yml          # Production compose (all services)
├── docker-compose.dev.yml      # Dev override (infra only)
├── eslint.config.js            # Flat ESLint config
├── .prettierrc                 # Prettier config
├── package.json                # Root workspace scripts
└── pnpm-workspace.yaml         # Workspace definition
```

---

## Getting Started

### Prerequisites

| Tool   | Version | Install                          |
| ------ | ------- | -------------------------------- |
| Node   | >= 20.x | [nodejs.org](https://nodejs.org) |
| pnpm   | >= 9.x  | `npm install -g pnpm`            |
| Docker | Latest  | [docker.com](https://docker.com) |

### Environment Variables

**API** — copy and fill in secrets:

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable             | Required | Default                 | Description                        |
| -------------------- | -------- | ----------------------- | ---------------------------------- |
| `NODE_ENV`           | No       | `development`           | Runtime environment                |
| `PORT`               | No       | `4000`                  | API server port                    |
| `DATABASE_URL`       | **Yes**  | -                       | PostgreSQL connection string       |
| `REDIS_URL`          | **Yes**  | -                       | Redis connection string            |
| `JWT_ACCESS_SECRET`  | **Yes**  | -                       | Min 32 chars — sign access tokens  |
| `JWT_REFRESH_SECRET` | **Yes**  | -                       | Min 32 chars — sign refresh tokens |
| `FRONTEND_URL`       | No       | `http://localhost:3000` | CORS allowed origin                |

**Web** — copy and fill in:

```bash
cp apps/web/.env.example apps/web/.env.local
```

| Variable               | Required | Default                     |
| ---------------------- | -------- | --------------------------- |
| `NEXT_PUBLIC_API_URL`  | No       | `http://localhost:4000/api` |
| `NEXT_PUBLIC_APP_NAME` | No       | `SyncSpace`                 |

### Running with Docker (Infrastructure Only)

This starts **only** PostgreSQL and Redis — recommended for local development:

```bash
# Start infrastructure
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Check services are healthy
docker compose ps
```

### Running Locally

```bash
# 1. Install all dependencies
pnpm install

# 2. Start infrastructure (Postgres + Redis)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 3. Generate Prisma client
pnpm --filter api prisma:generate

# 4. Run database migrations
pnpm --filter api prisma:migrate

# 5. Start the API (hot-reload via tsx watch)
pnpm dev:api

# 6. In a new terminal — start the frontend (Turbopack)
pnpm dev:web
```

| Service       | URL                                 |
| ------------- | ----------------------------------- |
| Web           | http://localhost:3000               |
| API           | http://localhost:4000               |
| Health check  | http://localhost:4000/api/v1/health |
| Prisma Studio | `pnpm --filter api prisma:studio`   |

---

## Development Workflow

### Scripts

Run these from the **monorepo root**:

| Script              | Description                             |
| ------------------- | --------------------------------------- |
| `pnpm dev:api`      | Start API with hot-reload (`tsx watch`) |
| `pnpm dev:web`      | Start Next.js with Turbopack            |
| `pnpm build`        | Build all packages recursively          |
| `pnpm typecheck`    | TypeScript check across all packages    |
| `pnpm lint`         | ESLint across all packages              |
| `pnpm lint:fix`     | ESLint auto-fix                         |
| `pnpm format`       | Prettier write all files                |
| `pnpm format:check` | Prettier check (used in CI)             |

Run these from **`apps/api`** (or prefix with `pnpm --filter api`):

| Script                     | Description                                 |
| -------------------------- | ------------------------------------------- |
| `pnpm prisma:generate`     | Regenerate Prisma client after schema edits |
| `pnpm prisma:migrate`      | Create and apply a new migration            |
| `pnpm prisma:migrate:prod` | Apply pending migrations (production)       |
| `pnpm prisma:studio`       | Open Prisma Studio UI                       |
| `pnpm prisma:seed`         | Run `prisma/seed.ts`                        |

### Code Quality

- **ESLint** — flat config at root (`eslint.config.js`). Enforces TypeScript rules, import ordering, consistent type imports, and no `console.log`.
- **Prettier** — config at root (`.prettierrc`). 100 char print width, double quotes, trailing commas.
- **TypeScript** — strict mode enabled in all packages. `noUncheckedIndexedAccess`, `noImplicitReturns` turned on.

### Git Hooks

Husky runs **lint-staged** before every commit:

- `*.{ts,tsx}` → ESLint fix → Prettier write
- `*.{js,jsx,json,md,yml,yaml}` → Prettier write

---

## Database

The Prisma schema at [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma) defines the full data model:

| Model                | Description                           |
| -------------------- | ------------------------------------- |
| `User`               | User accounts                         |
| `RefreshToken`       | JWT refresh token store               |
| `Organization`       | Multi-tenant org (slug-addressable)   |
| `OrganizationMember` | User ↔ Org with role                  |
| `Invite`             | Email invitations with expiry         |
| `Project`            | Projects within an org                |
| `ProjectMember`      | User ↔ Project with role              |
| `Board`              | Kanban boards in a project            |
| `Column`             | Board columns with position ordering  |
| `Task`               | Tasks with status, priority, assignee |
| `Comment`            | Task comments                         |
| `File`               | Cloudinary-backed file attachments    |
| `Notification`       | In-app notification feed              |
| `ActivityLog`        | Audit log for all entity changes      |

---

## Delivery Roadmap

| Phase | Name                      | Status      |
| ----- | ------------------------- | ----------- |
| **1** | Project Setup & Monorepo  | ✅ Complete |
| 2     | Authentication (JWT)      | 🔜 Up next  |
| 3     | Organizations & Projects  | Planned     |
| 4     | Kanban Boards & Tasks     | Planned     |
| 5     | Real-time & Notifications | Planned     |
| 6     | File Uploads & Production | Planned     |

---

## Contributing

This project follows a phase-based delivery model. Please:

1. Branch from `develop` — `git checkout -b feat/your-feature`
2. All commits pass Husky pre-commit hooks automatically
3. Open PRs against `develop`; CI must pass (lint → typecheck → build)
4. Squash merge to keep history clean
