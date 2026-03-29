# Library Portal

A self-hosted library management system with a REST API and web frontend. Manage books, copies, shelves, loans, reservations, members, and more — all from a single Docker Compose setup.

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env — set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to strong random strings

# 2. Start everything
docker compose up --build -d

# 3. Open the setup wizard
# Visit http://localhost:80
# The setup wizard walks you through creating your admin account,
# first library, groups, membership types, email, and access settings.
```

That's it. The database is created automatically on first boot.

## How It Works

### Architecture

```
┌──────────────┐     ┌──────────────┐
│   site       │────▶│   api        │
│   (nginx)    │     │   (Express)  │
│   port 80    │     │   port 3000  │
└──────────────┘     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │   SQLite DB  │
                     │   (volume)   │
                     └──────────────┘
```

- **API** — Node.js + TypeScript, Express 4, Prisma ORM, SQLite
- **Site** — React 19, Vite, Tailwind CSS v4, served by nginx
- **Database** — SQLite file stored on a Docker volume, persists across container rebuilds

### Setup Wizard

On first boot (or after deleting the database), the setup wizard appears:

1. **Verify server access** — a 6-digit code is printed to `docker compose logs api`. Enter it to prove you control the server.
2. **Choose a path:**
   - **Restore from backup** — if backups exist on the volume, pick one to restore
   - **Start fresh** — create your admin account and configure the system
   - **Seed demo data** (dev mode only) — populate with sample libraries, books, and test accounts
3. **Configure** — create your first library, set up groups/roles, membership types, email settings, and registration access

### Data Persistence

| Data | Volume Mount | Survives container rebuild? |
|------|-------------|---------------------------|
| Database | `./data/api_data/prod.db` | Yes |
| Backups | `./data/db_backups/` | Yes |
| Uploads (covers, avatars) | `./data/api_data/uploads/` | Yes |

Deleting `./data/api_data/prod.db` triggers the setup wizard again. Backups on `./data/db_backups/` survive independently and can be restored during setup.

## Docker Compose

```bash
docker compose up --build        # first run / after code changes
docker compose up                # subsequent runs
docker compose up -d             # detached mode
docker compose logs -f           # tail all logs
docker compose logs -f api       # tail API logs only
docker compose down              # stop everything
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_ACCESS_SECRET` | Yes | — | Secret for access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | — | Secret for refresh tokens (min 32 chars) |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime |
| `CORS_ORIGIN` | No | `http://localhost` | Allowed origin for CORS |
| `NODE_ENV` | No | `production` | `development` enables dev mode features |
| `TRUST_PROXY` | No | `false` | Set `true` when behind a reverse proxy |
| `WEBAUTHN_RP_ID` | No | `localhost` | WebAuthn relying party ID (your domain) |

## Features

### Library Management
- Multiple libraries with separate shelves, books, and staff
- Shelf positions (L/M/R), genres, capacity tracking
- Custom barcode formats for shelves (Code 128) and copies (DataMatrix)
- Barcode scanning via USB/Bluetooth scanner or manual entry
- Print labels to browser, thermal printer (ZPL), or IPP

### Books & Copies
- ISBN lookup and import from Open Library
- Cover image uploads
- Per-copy condition tracking with custom condition lists
- Copy status lifecycle: Available → On Loan → Returned / Damaged / Retired

### Loans & Reservations
- Issue loans with barcode scanning — scan a copy, pick a member, set due date
- Auto-overdue detection with configurable grace periods and max renewals
- Reservation queue with automatic expiry
- Damage reporting on return with condition comparison

### Members & Access
- Role-based access: Admin, Librarian, Member (custom roles via groups)
- Granular permission system with per-role overrides
- Library memberships with types (Staff, Permanent, Yearly, Monthly)
- Registration modes: open, domain-restricted, token-gated, or disabled
- Optional email verification and admin approval

### Two-Factor Authentication
- TOTP (authenticator apps) and WebAuthn security keys
- Admin can require 2FA for specific roles
- Security-keys-only mode for high-security environments
- Admin can force 2FA on individual users
- Zero-knowledge backup codes (XXXX-XXXX-XXXX-XXXX format, bcrypt-hashed)
  - Auto-generated on first 2FA setup
  - Using a backup code disables all 2FA on the account

### Backups
- Automatic daily backups at 02:00 with configurable retention
- Manual backups from the admin panel
- Pre-delete backups before destructive operations
- Restore with integrity check, migration compatibility validation, and atomic file swap
- Backup-aware setup wizard for disaster recovery

### Admin
- Audit log for all significant actions
- System settings (branding, SMTP, registration, barcodes, 2FA, loan config)
- Factory reset with console verification
- Database backup/restore with security key or console code verification
- File manager for uploaded content

## Development

For local development without Docker:

```bash
# Terminal 1: API
cd api
cp .env.example .env
npm install
npm run db:migrate
npm run dev                    # http://localhost:3000

# Terminal 2: Site
cd site
npm install
npm run dev                    # http://localhost:5173

# Optional: Database GUI
cd api
npm run db:studio              # http://localhost:5555
```

### Dev Seed Accounts

When using "Seed demo data" in the setup wizard (development mode only):

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@library.com | Admin1234! |
| Librarian | librarian@library.com | Librarian1! |
| Member | member@library.com | Member123! |

### Project Structure

```
libraryPortal/
├── api/                    — REST API
│   ├── prisma/             — Schema, migrations, seed
│   ├── src/
│   │   ├── config/         — Environment validation
│   │   ├── lib/            — Shared utilities (JWT, mailer, permissions, audit)
│   │   ├── middleware/     — Auth, validation, 2FA enforcement, error handling
│   │   └── modules/        — Feature modules (auth, books, loans, setup, etc.)
│   └── Dockerfile
├── site/                   — React frontend
│   ├── src/
│   │   ├── api/            — Typed API clients
│   │   ├── components/     — Shared UI components
│   │   ├── hooks/          — Auth, query hooks
│   │   ├── pages/          — Route pages (public, member, admin, setup)
│   │   └── store/          — Zustand stores (auth, brand, theme)
│   └── Dockerfile
├── docker-compose.yaml
├── .env.example
└── data/                   — Docker volume mounts (gitignored)
    ├── api_data/           — Database + uploads
    └── db_backups/         — Backup files
```

## API Reference

See [api/api.md](api/api.md) for the full API reference including all routes, request/response shapes, auth requirements, and the permission system.

## Frontend Plan

See [site/plan.md](site/plan.md) for the frontend implementation plan, component structure, and routing.

## Design Guidelines

See [site/web-design.md](site/web-design.md) for the design language, component patterns, and anti-patterns.
