# DB Persistence & Setup Wizard Backup Restore — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the setup wizard backup-aware so users can restore from an existing backup on fresh DB, and harden all backup/restore operations for safety.

**Architecture:** Enhance `backups.service.ts` with a shared `safeRestore()` function (atomic swap, WAL handling, integrity check, migration compat, session invalidation). Add setup restore routes. Update SetupWizard to show path chooser (Restore / Fresh / Seed) when backups exist on the volume.

**Tech Stack:** Express, Prisma/SQLite, React, `sqlite3` CLI (added to Alpine), `child_process.execSync`

---

### Task 1: Add sqlite3 to Docker image and harden backup creation with WAL checkpoint

**Files:**
- Modify: `api/Dockerfile:18`
- Modify: `api/src/modules/backups/backups.service.ts:70-99`

- [ ] **Step 1: Add sqlite to Alpine packages in Dockerfile**

In `api/Dockerfile`, change line 18:
```dockerfile
RUN apk add --no-cache openssl su-exec sqlite
```

- [ ] **Step 2: Add WAL checkpoint to createBackup**

In `api/src/modules/backups/backups.service.ts`, add `prisma` import at top:
```typescript
import { prisma } from '../../lib/prisma'
```

Then in the `createBackup` function, add WAL checkpoint before the file copy (before the `fs.copyFileSync` on line 82):
```typescript
export async function createBackup(reason: BackupMeta['reason'], note: string): Promise<BackupMeta> {
  ensureDir()
  const dbPath = getDbPath()
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found at ${dbPath}`)
  }

  // Flush WAL to main DB file so the copy is self-contained
  try {
    await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)')
  } catch { /* ignore — may not be in WAL mode */ }

  const id = crypto.randomBytes(8).toString('hex')
```

Note: the function signature changes from sync to async (`Promise<BackupMeta>`).

- [ ] **Step 3: Update all callers of createBackup to await it**

In `api/src/modules/backups/backups.router.ts` line 99, the call is already in an async handler — add `await`:
```typescript
const backup = await backupService.createBackup('manual', note)
```

In `api/src/index.ts` line 18, the cron callback needs to become async:
```typescript
cron.schedule('0 2 * * *', async () => {
    try {
      const backup = await createBackup('scheduled', 'Daily automatic backup')
```

In `api/src/modules/setup/setup.service.ts` line 374-375, add await:
```typescript
await createBackup('pre-delete', 'Before factory reset')
```

In `api/src/modules/libraries/libraries.service.ts` and `api/src/modules/shelves/shelves.service.ts`, search for `createBackup` calls and add `await` if present.

- [ ] **Step 4: Verify compilation**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add api/Dockerfile api/src/modules/backups/backups.service.ts api/src/index.ts api/src/modules/setup/setup.service.ts api/src/modules/backups/backups.router.ts api/src/modules/libraries/libraries.service.ts api/src/modules/shelves/shelves.service.ts
git commit -m "feat: add sqlite3 to Docker image and WAL checkpoint to backup creation"
```

---

### Task 2: Create safeRestore() in backups.service.ts

**Files:**
- Modify: `api/src/modules/backups/backups.service.ts`

This replaces the existing `restoreBackup()` with a robust `safeRestore()` that handles: integrity check, migration compat, Prisma disconnect, atomic swap, WAL cleanup, migrate deploy, session invalidation.

- [ ] **Step 1: Add execSync import and migration directory constant**

At the top of `backups.service.ts`:
```typescript
import { execSync } from 'child_process'
```

Add after `BACKUP_DIR`/`INDEX_FILE`:
```typescript
const MIGRATIONS_DIR = path.resolve(__dirname, '../../../prisma/migrations')
```

- [ ] **Step 2: Add integrity check function**

```typescript
function checkIntegrity(filePath: string): void {
  // Validate SQLite header
  const header = Buffer.alloc(16)
  const fd = fs.openSync(filePath, 'r')
  fs.readSync(fd, header, 0, 16, 0)
  fs.closeSync(fd)
  if (!header.toString('utf-8', 0, 15).startsWith('SQLite format 3')) {
    throw new Error('Invalid backup file: not a SQLite database')
  }

  // Full integrity check via sqlite3 CLI
  try {
    const result = execSync(`sqlite3 "${filePath}" "PRAGMA integrity_check;"`, {
      timeout: 30000,
      encoding: 'utf-8',
    }).trim()
    if (result !== 'ok') {
      throw new Error(`Backup integrity check failed: ${result}`)
    }
  } catch (err: any) {
    if (err.message?.includes('integrity check failed') || err.message?.includes('not a SQLite')) throw err
    // sqlite3 not available — header check already passed, continue
    console.warn('[Restore] sqlite3 CLI not available for full integrity check, proceeding with header validation only')
  }
}
```

- [ ] **Step 3: Add migration compatibility check function**

```typescript
function checkMigrationCompat(filePath: string): void {
  try {
    // Get migrations from backup DB
    const raw = execSync(
      `sqlite3 "${filePath}" "SELECT migration_name FROM _prisma_migrations ORDER BY migration_name;"`,
      { timeout: 10000, encoding: 'utf-8' },
    ).trim()
    if (!raw) return // No migrations in backup — will be applied by migrate deploy

    const backupMigrations = raw.split('\n').map((l) => l.trim()).filter(Boolean)

    // Get migrations from codebase
    const codeMigrations = fs.readdirSync(MIGRATIONS_DIR)
      .filter((d) => fs.statSync(path.join(MIGRATIONS_DIR, d)).isDirectory())
      .sort()

    const unknown = backupMigrations.filter((m) => !codeMigrations.includes(m))
    if (unknown.length > 0) {
      throw new Error(
        `Backup contains migrations not in current code: ${unknown.join(', ')}. Update the application before restoring.`,
      )
    }
  } catch (err: any) {
    if (err.message?.includes('not in current code')) throw err
    // sqlite3 not available — skip check
    console.warn('[Restore] Could not check migration compatibility, proceeding')
  }
}
```

- [ ] **Step 4: Replace restoreBackup() with safeRestore()**

Replace the existing `restoreBackup` function entirely:

```typescript
export async function safeRestore(id: string): Promise<void> {
  const backupPath = getBackupPath(id)
  if (!backupPath) throw new Error('Backup not found')

  // 1. Integrity check
  checkIntegrity(backupPath)

  // 2. Migration compatibility
  checkMigrationCompat(backupPath)

  // 3. Disconnect Prisma
  await prisma.$disconnect()

  const dbPath = getDbPath()

  // 4. Atomic swap: copy to temp, then rename
  const tmpPath = dbPath + '.restore-tmp'
  try {
    fs.copyFileSync(backupPath, tmpPath)
    fs.renameSync(tmpPath, dbPath)
  } catch (err) {
    // Clean up temp file on failure
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
    await prisma.$connect()
    throw err
  }

  // 5. WAL cleanup
  for (const ext of ['-wal', '-shm', '-journal']) {
    const f = dbPath + ext
    if (fs.existsSync(f)) fs.unlinkSync(f)
  }

  // 6. Apply pending migrations
  try {
    execSync('npx prisma migrate deploy', {
      cwd: path.resolve(__dirname, '../../../'),
      timeout: 60000,
      encoding: 'utf-8',
      env: { ...process.env },
    })
  } catch (err: any) {
    console.error('[Restore] Migration deploy failed:', err.message)
  }

  // 7. Reconnect Prisma
  await prisma.$connect()

  // 8. Invalidate all sessions
  try {
    await prisma.refreshToken.deleteMany()
  } catch { /* table may not exist in very old backups */ }

  console.log(`[Restore] Database restored from backup ${id}`)
}
```

- [ ] **Step 5: Verify compilation**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add api/src/modules/backups/backups.service.ts
git commit -m "feat: add safeRestore() with integrity check, atomic swap, WAL cleanup, session invalidation"
```

---

### Task 3: Update admin restore route to use safeRestore()

**Files:**
- Modify: `api/src/modules/backups/backups.router.ts:79-86,161-197`

- [ ] **Step 1: Fix constant-time comparison in verifyCode**

In `backups.router.ts`, replace line 83:
```typescript
if (stored.code !== code) return false
```
with:
```typescript
const expected = Buffer.from(stored.code, 'utf8')
const received = Buffer.from(String(code).padEnd(expected.length), 'utf8')
if (expected.length !== received.length || !require('crypto').timingSafeEqual(expected, received)) return false
```

- [ ] **Step 2: Update restore route to use safeRestore and process.exit**

Replace the restore route handler (lines 161-197). Change `backupService.restoreBackup(id)` to:
```typescript
await backupService.safeRestore(id)
logAction({
  actorId: req.user!.id,
  actorName: req.user!.email,
  action: 'BACKUP_RESTORED',
  targetType: 'Backup',
  targetId: id,
  targetName: backup.filename,
})
res.json({ success: true, message: 'Database restored. Server is restarting.' })
setTimeout(() => process.exit(0), 500)
return
```

- [ ] **Step 3: Fix constant-time comparison in setup.controller.ts factoryReset**

In `api/src/modules/setup/setup.controller.ts`, replace line 142:
```typescript
if (stored.code !== code) {
```
with:
```typescript
const expected = Buffer.from(stored.code, 'utf8')
const received = Buffer.from(String(code).padEnd(expected.length), 'utf8')
if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
```

- [ ] **Step 4: Verify compilation**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/backups/backups.router.ts api/src/modules/setup/setup.controller.ts
git commit -m "fix: use safeRestore for admin restore, fix constant-time comparisons"
```

---

### Task 4: Add setup restore endpoints

**Files:**
- Modify: `api/src/modules/setup/setup.service.ts`
- Modify: `api/src/modules/setup/setup.controller.ts`
- Modify: `api/src/modules/setup/setup.router.ts`
- Modify: `api/src/app.ts`

- [ ] **Step 1: Update getStatus() to include backupCount**

In `setup.service.ts`, add import at top:
```typescript
import { listBackups } from '../backups/backups.service'
```

In `getStatus()`, add backup count when setup is needed:
```typescript
let backupCount = 0
if (setup) {
  try { backupCount = listBackups().length } catch { /* backups dir may not exist */ }
}

return {
  needsSetup: setup,
  backupCount,
  devMode: devSetting?.value === 'true',
  devSeeded: seededSetting?.value === 'true',
  environment: env.NODE_ENV,
  hasExistingData,
}
```

- [ ] **Step 2: Add listSetupBackups() and restoreFromBackup() to setup.service.ts**

```typescript
export function listSetupBackups() {
  return listBackups().map((b) => ({
    id: b.id,
    label: b.label,
    size: b.size,
    reason: b.reason,
    createdAt: b.createdAt,
  }))
}

export async function restoreFromBackup(backupId: string): Promise<void> {
  await guardSetup()
  const { safeRestore } = await import('../backups/backups.service')
  console.log(`[Setup] Restoring from backup ${backupId}`)
  await safeRestore(backupId)
}
```

- [ ] **Step 3: Add controller functions**

In `setup.controller.ts`, add:
```typescript
export async function listBackups(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.headers['x-setup-token'] as string
    if (!token) { res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing setup token' }); return }
    setupService.verifySetupToken(token)
    res.json({ backups: setupService.listSetupBackups() })
  } catch (err) { next(err) }
}

export async function restoreBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.headers['x-setup-token'] as string
    if (!token) { res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing setup token' }); return }
    setupService.verifySetupToken(token)
    setupService.consumeSetupToken(token)

    const { backupId } = req.body as { backupId: string }
    if (!backupId) { res.status(400).json({ code: 'VALIDATION_ERROR', message: 'backupId is required' }); return }

    await setupService.restoreFromBackup(backupId)
    res.json({ success: true, message: 'Database restored. Server is restarting.' })
    setTimeout(() => process.exit(0), 500)
  } catch (err) { next(err) }
}
```

- [ ] **Step 4: Add routes**

In `setup.router.ts`, add:
```typescript
router.get('/backups', controller.listBackups)
router.post('/restore-backup', controller.restoreBackup)
```

- [ ] **Step 5: Add rate limit for restore endpoint**

In `api/src/app.ts`, add after the existing setup rate limit (line 119):
```typescript
app.use('/api/setup/restore-backup', rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { code: 'RATE_LIMITED', message: 'Too many attempts' } }))
```

- [ ] **Step 6: Verify compilation**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add api/src/modules/setup/setup.service.ts api/src/modules/setup/setup.controller.ts api/src/modules/setup/setup.router.ts api/src/app.ts
git commit -m "feat: add setup restore endpoints with backup listing and restore"
```

---

### Task 5: Update frontend setup API client

**Files:**
- Modify: `site/src/api/setup.ts`

- [ ] **Step 1: Update SetupStatus interface and add new API methods**

In `site/src/api/setup.ts`, add `backupCount` to `SetupStatus`:
```typescript
export interface SetupStatus {
  needsSetup: boolean
  backupCount: number
  devMode: boolean
  devSeeded: boolean
  environment: 'development' | 'production' | 'test'
  hasExistingData: boolean
}
```

Add backup types and methods to `setupApi`:
```typescript
export interface SetupBackup {
  id: string
  label: string
  size: number
  reason: string
  createdAt: string
}

export const setupApi = {
  // ... existing methods ...

  listBackups: (setupToken: string) =>
    api.get<{ backups: SetupBackup[] }>('/setup/backups', {
      headers: { 'X-Setup-Token': setupToken },
    }).then((r) => r.data.backups),

  restoreBackup: (setupToken: string, backupId: string) =>
    api.post('/setup/restore-backup', { backupId }, {
      headers: { 'X-Setup-Token': setupToken },
    }).then((r) => r.data),
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd site && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add site/src/api/setup.ts
git commit -m "feat: add backup listing and restore methods to setup API client"
```

---

### Task 6: Update SetupWizard with path chooser and restore flow

**Files:**
- Modify: `site/src/pages/setup/SetupWizard.tsx`

- [ ] **Step 1: Update WelcomeStep to show path chooser**

The current `WelcomeStep` always shows the code verification flow. We need to change it so:
- If `backupCount > 0`: show a path chooser first (Restore from backup / Start fresh / Seed demo)
- All paths lead to the same code verification, then branch based on chosen path

Replace the `WelcomeStep` component. Add a `chosenPath` state and pass `backupCount` as a prop:

```typescript
function WelcomeStep({
  onVerified,
  backupCount,
  isDev,
}: {
  onVerified: (token: string, path: 'fresh' | 'restore' | 'seed') => void
  backupCount: number
  isDev: boolean
}) {
  const [chosenPath, setChosenPath] = useState<'fresh' | 'restore' | 'seed' | null>(
    backupCount > 0 ? null : 'fresh',
  )
  const [phase, setPhase] = useState<'choose' | 'intro' | 'waiting' | 'input'>(
    backupCount > 0 ? 'choose' : 'intro',
  )
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChoose = (p: 'fresh' | 'restore' | 'seed') => {
    setChosenPath(p)
    setPhase('intro')
  }

  const handleGenerate = async () => { /* same as current */ }
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6 || !chosenPath) return
    setLoading(true)
    try {
      const { setupToken } = await setupApi.verifyCode(code)
      onVerified(setupToken, chosenPath)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  // Render: if phase === 'choose', show path chooser buttons
  // Otherwise show the existing code flow (intro → waiting → input)
}
```

The path chooser UI should show:
- A card with three options when `backupCount > 0`
- "Restore from backup" with backup count badge
- "Start fresh"
- "Seed demo data" (only in dev mode)
- When `backupCount === 0`, skip directly to 'intro' phase with `chosenPath = 'fresh'`

- [ ] **Step 2: Add RestoreStep component**

New component that shows after code verification when path is 'restore':

```typescript
function RestoreStep({
  setupToken,
  onRestored,
}: {
  setupToken: string
  onRestored: () => void
}) {
  const [backups, setBackups] = useState<SetupBackup[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    setupApi.listBackups(setupToken)
      .then(setBackups)
      .catch((err) => toast.error(extractError(err)))
      .finally(() => setLoading(false))
  }, [setupToken])

  const handleRestore = async () => {
    if (!selectedId) return
    setRestoring(true)
    try {
      await setupApi.restoreBackup(setupToken, selectedId)
      toast.success('Database restored — server is restarting...')
      // Wait for server to come back up, then reload
      setTimeout(() => { window.location.href = '/' }, 3000)
    } catch (err) {
      toast.error(extractError(err))
      setRestoring(false)
    }
  }

  // Render: list of backups as selectable cards (label, date, size),
  // a "Restore" button that calls handleRestore
}
```

Import `SetupBackup` type from `../../api/setup` and add `useEffect` to the imports.

- [ ] **Step 3: Update the main SetupWizard component**

In the main `SetupWizard` component, add state for the chosen path and handle routing:

```typescript
const [chosenPath, setChosenPath] = useState<'fresh' | 'restore' | 'seed' | null>(null)
```

Update the `step === 0` render to pass `backupCount` and handle the path:
```typescript
{step === 0 && (
  <WelcomeStep
    backupCount={status?.backupCount ?? 0}
    isDev={isDev}
    onVerified={(token, path) => {
      setSetupToken(token)
      setChosenPath(path)
      if (path === 'restore') {
        setStep(1) // goes to RestoreStep
      } else if (path === 'seed') {
        // Handle seed inline (existing devSeed flow but with token already obtained)
        handleDevSeedWithToken(token)
      } else {
        setStep(1) // goes to AdminStep
      }
    }}
  />
)}
```

For the restore path, when `step === 1 && chosenPath === 'restore'`, show `RestoreStep` instead of `AdminStep`:
```typescript
{step === 1 && chosenPath === 'restore' && (
  <RestoreStep setupToken={setupToken} onRestored={() => onComplete?.()} />
)}
{step === 1 && chosenPath !== 'restore' && (
  <AdminStep setupToken={setupToken} onCreated={next} />
)}
```

- [ ] **Step 4: Verify compilation**

Run: `cd site && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add site/src/pages/setup/SetupWizard.tsx
git commit -m "feat: setup wizard path chooser with backup restore flow"
```

---

### Task 7: Update api.md and README documentation

**Files:**
- Modify: `api/api.md`
- Modify: `README.md`

- [ ] **Step 1: Update api.md**

Add to the Setup section the new endpoints:
- `GET /api/setup/backups` — requires `X-Setup-Token` header, returns backup list during setup
- `POST /api/setup/restore-backup` — requires `X-Setup-Token` header, body `{ backupId }`, restores DB and restarts server

Update the Backups section to note:
- Backup creation now runs WAL checkpoint for consistent snapshots
- Admin restore now uses `safeRestore()` with integrity check, atomic swap, WAL cleanup, session invalidation, and process restart

- [ ] **Step 2: Update README.md**

Add a section noting:
- Database persists on Docker volume (`./data/api_data`)
- Backups persist on separate volume (`./data/db_backups`)
- Deleting the DB triggers setup wizard with option to restore from backup
- All restore operations invalidate sessions and restart the server

- [ ] **Step 3: Commit**

```bash
git add api/api.md README.md
git commit -m "docs: update API reference and README for backup-aware setup wizard"
```

---

### Task 8: Build and end-to-end verification

- [ ] **Step 1: Type-check both projects**

```bash
cd api && npx tsc --noEmit
cd ../site && npx tsc --noEmit
```
Expected: Both pass with no errors

- [ ] **Step 2: Rebuild Docker**

```bash
docker compose down
rm -f data/api_data/prod.db data/api_data/prod.db-wal data/api_data/prod.db-shm
docker compose up --build -d
```

- [ ] **Step 3: Verify setup wizard shows on fresh DB**

Navigate to `http://localhost:8080`. Should see setup wizard. Since no backups exist, should go straight to code verification → admin creation.

- [ ] **Step 4: Create some data and a manual backup**

Complete setup, create a library, then go to `/admin/backups` and create a manual backup.

- [ ] **Step 5: Delete DB and verify restore option appears**

```bash
docker compose down
rm -f data/api_data/prod.db*
docker compose up -d
```

Navigate to setup wizard — should now show "Restore from backup (1 found)" option alongside "Start fresh".

- [ ] **Step 6: Commit final state**

```bash
git add -A
git commit -m "feat: complete DB persistence and backup-aware setup wizard"
```
