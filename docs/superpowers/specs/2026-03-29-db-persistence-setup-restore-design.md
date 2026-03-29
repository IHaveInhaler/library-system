# Database Persistence & Setup Wizard Backup Restore

**Date:** 2026-03-29
**Status:** Approved

## Problem

When the database file is deleted (or on a truly fresh deployment), the app should:
1. Detect "no database" and present the setup wizard
2. Offer to restore from an existing backup if one is available on the volume
3. Ensure the DB always lives on the Docker volume so it persists across container rebuilds
4. Ensure scheduled backups survive DB resets

Currently, the DB path and volume mounts are correct, but:
- Deleting the DB doesn't reliably trigger the setup wizard flow
- There's no way to restore a backup during setup
- Backup creation doesn't checkpoint WAL, so backups may miss recent writes
- The existing restore flow (admin-only) doesn't handle Prisma connections or WAL files safely

## Design

### Setup Wizard Flow (when `needsSetup` is true)

```
GET /api/setup/status
  → { needsSetup: true, backupCount: 3, ... }

User sees setup wizard step 1:
  ┌─────────────────────────────────────┐
  │  Welcome to Library Portal          │
  │                                     │
  │  [Restore from backup] (3 found)    │
  │  [Start fresh]                      │
  │  [Seed demo data] (dev mode only)   │
  └─────────────────────────────────────┘

ALL paths require console verification code first:
  1. User clicks chosen path
  2. API generates 6-digit code, prints to docker compose logs
  3. User enters code in wizard → gets setup token
  4. Proceeds with chosen path using setup token
```

### Path: Restore from Backup

After verifying the console code:

1. `GET /api/setup/backups` (requires setup token) — returns full backup list with labels, sizes, dates
2. User picks a backup
3. `POST /api/setup/restore-backup` (requires setup token) with `{ backupId }`
4. Backend:
   a. Validate backup exists and file is present
   b. Run SQLite integrity check on backup file
   c. Check migration compatibility (no "future" migrations)
   d. `prisma.$disconnect()`
   e. Atomic copy: `copyFileSync(backup, prod.db.restore-tmp)` → `renameSync(tmp, prod.db)`
   f. Delete WAL/SHM files (`prod.db-wal`, `prod.db-shm`)
   g. Run `prisma migrate deploy` (via child_process) to apply any newer migrations
   h. Truncate `RefreshToken` table to invalidate all sessions
   i. Log restore to stdout (audit log in old DB is gone)
   j. Return success response
   k. `setTimeout(() => process.exit(0), 500)` — Docker restarts container
5. Frontend detects disconnect, waits, reloads → lands on login page

### Path: Start Fresh

After verifying the console code:
1. Admin creation form (email, password, name)
2. `POST /api/setup/admin` (requires setup token) — creates admin user, sets `setup.completed`
3. Returns tokens, user logged in

### Path: Seed Demo Data (dev mode only)

Unchanged from current flow — requires console code, seeds dev data.

### Backup Creation Hardening

Before copying the DB file for any backup (scheduled, manual, pre-delete):
1. Run `PRAGMA wal_checkpoint(TRUNCATE)` to flush WAL into main DB file
2. Then `fs.copyFileSync` as now

This ensures backups are self-contained single-file snapshots.

### Restore Safety (applies to both setup restore AND admin restore)

Every restore operation must:

1. **Integrity check**: Run `PRAGMA integrity_check` on the backup file via `sqlite3` CLI (add `sqlite` to Alpine Dockerfile). Fall back to header-only check if CLI unavailable.
2. **Migration compatibility check**: Read `_prisma_migrations` from backup, verify no migrations exist that aren't in the current codebase's `prisma/migrations/` directory. Reject "future" backups with a clear error.
3. **Prisma disconnect**: `prisma.$disconnect()` before touching the file.
4. **Atomic swap**: Copy to `.restore-tmp`, then `renameSync` to the real path. Crash during copy leaves original intact.
5. **WAL cleanup**: Delete `-wal` and `-shm` files after the swap.
6. **Apply migrations**: Run `prisma migrate deploy` to bring restored schema up to date.
7. **Invalidate sessions**: Truncate `RefreshToken` table.
8. **Process restart**: `process.exit(0)` after sending response. Docker `restart: unless-stopped` brings it back.

### Security Model

| Path | Console code required | Setup token required | Rate limited |
|------|----------------------|---------------------|-------------|
| Start fresh (admin creation) | Yes | Yes | Yes (5/15min) |
| Restore from backup | Yes | Yes | Yes (5/15min) |
| Seed demo data | Yes | Yes | Yes (5/15min) |
| List backups during setup | No code, but setup token | Yes | Global only |

- Backup metadata (labels, sizes, dates) is NOT returned in the unauthenticated `/api/setup/status` — only `backupCount: number`
- Full backup list requires setup token via `GET /api/setup/backups`
- All code comparisons use `crypto.timingSafeEqual` (fix existing factory reset and backup router comparisons too)

## File Changes

### Backend

| File | Change |
|------|--------|
| `api/Dockerfile` | Add `sqlite` to Alpine packages |
| `api/src/modules/setup/setup.service.ts` | Add `restoreFromBackup()`, `listSetupBackups()`, `checkMigrationCompat()`. Update `getStatus()` to include `backupCount`. |
| `api/src/modules/setup/setup.router.ts` | Add `GET /setup/backups` (setup token), `POST /setup/restore-backup` (setup token) |
| `api/src/modules/setup/setup.controller.ts` | No changes — all paths keep setup token requirement |
| `api/src/modules/backups/backups.service.ts` | Add WAL checkpoint to `createBackup()`. Extract shared `safeRestore()` function used by both setup and admin restore. Add integrity check and migration compat check. Use atomic file swap. |
| `api/src/modules/backups/backups.router.ts` | Update admin restore to use shared `safeRestore()`. Fix constant-time comparison. |
| `api/src/app.ts` | Add rate limit on `/api/setup/restore-backup` |

### Frontend

| File | Change |
|------|--------|
| `site/src/pages/setup/SetupWizard.tsx` | Step 1 becomes path chooser when `backupCount > 0`. Add restore flow: verify code → pick backup → restore → reload. Fresh path: verify code → admin form (as now). |
| `site/src/api/setup.ts` | Add `listBackups(setupToken)`, `restoreBackup(setupToken, backupId)` API methods |

### Docker (no compose changes)

The `docker-compose.yaml` volume mounts are already correct:
- `./data/api_data:/app/data` — DB lives here
- `./data/db_backups:/app/data/backups` — backups live here, survive DB deletion

## What Persists Across DB Resets

| Data | Location | Survives DB delete? |
|------|----------|-------------------|
| Database (`prod.db`) | `./data/api_data/` | No (that's the point) |
| Backup files (`.db`) | `./data/db_backups/` | Yes |
| Backup index (`backups.json`) | `./data/db_backups/` | Yes |
| Uploaded files | `./data/api_data/uploads/` | Yes |
| Docker env vars | `.env` | Yes |

## Edge Cases

- **No backups exist**: Setup wizard shows only "Start fresh" (and "Seed" in dev mode). No restore option.
- **Backup from newer code version**: Rejected with clear error message explaining the user needs to update the application first.
- **Corrupt backup file**: Integrity check fails, user sees error, can try a different backup.
- **Power loss during restore**: Atomic swap means either the old DB or the new DB is intact — never a partial file.
- **Concurrent restore attempts**: Only possible during setup (single user). The `needsSetup` guard and setup token provide sufficient serialization.
