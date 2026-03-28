import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const DATA_DIR = process.env.DATABASE_URL?.includes('/app/data/')
  ? '/app/data'
  : path.resolve(__dirname, '../../../')

const BACKUP_DIR = path.join(DATA_DIR, 'backups')
const INDEX_FILE = path.join(BACKUP_DIR, 'backups.json')

// Resolve the actual SQLite database file path from DATABASE_URL
function getDbPath(): string {
  const url = process.env.DATABASE_URL || 'file:./dev.db'
  const filePath = url.replace('file:', '')
  if (path.isAbsolute(filePath)) return filePath
  return path.resolve(__dirname, '../../../prisma', filePath)
}

export interface BackupMeta {
  id: string
  filename: string
  label: string
  size: number
  reason: 'scheduled' | 'pre-delete' | 'manual'
  note: string
  createdAt: string
}

function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

function readIndex(): BackupMeta[] {
  ensureDir()
  if (!fs.existsSync(INDEX_FILE)) return []
  try {
    const raw = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8')) as any[]
    // Backfill label for older backups that don't have one
    return raw.map((b) => ({ ...b, label: b.label || generateLabel(b.reason, b.note) }))
  } catch {
    return []
  }
}

function writeIndex(backups: BackupMeta[]) {
  ensureDir()
  fs.writeFileSync(INDEX_FILE, JSON.stringify(backups, null, 2))
}

export function listBackups(): BackupMeta[] {
  return readIndex().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

function generateLabel(reason: BackupMeta['reason'], note: string): string {
  if (reason === 'scheduled') return 'Daily Backup'
  if (reason === 'manual') return note || 'Manual Backup'
  // pre-delete — derive from note
  if (note.startsWith('Before deleting')) {
    if (note.includes('library') || note.includes('Library')) return 'Pre-Library Delete'
    if (note.includes('shelf')) return 'Pre-Shelf Delete'
    return 'Pre-Delete Backup'
  }
  if (note.includes('migrating position')) return 'Pre-Position Migration'
  if (note.includes('factory reset')) return 'Pre-Factory Reset'
  if (note.includes('restore')) return 'Pre-Restore Backup'
  return note || 'Pre-Delete Backup'
}

export function createBackup(reason: BackupMeta['reason'], note: string): BackupMeta {
  ensureDir()
  const dbPath = getDbPath()
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found at ${dbPath}`)
  }

  const id = crypto.randomBytes(8).toString('hex')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `backup-${timestamp}.db`
  const destPath = path.join(BACKUP_DIR, filename)

  fs.copyFileSync(dbPath, destPath)
  const stats = fs.statSync(destPath)

  const meta: BackupMeta = {
    id,
    filename,
    label: generateLabel(reason, note),
    size: stats.size,
    reason,
    note,
    createdAt: new Date().toISOString(),
  }

  const index = readIndex()
  index.push(meta)
  writeIndex(index)

  return meta
}

export function getBackup(id: string): BackupMeta | undefined {
  return readIndex().find((b) => b.id === id)
}

export function getBackupPath(id: string): string | null {
  const backup = getBackup(id)
  if (!backup) return null
  const filePath = path.join(BACKUP_DIR, path.basename(backup.filename))
  return fs.existsSync(filePath) ? filePath : null
}

export function deleteBackup(id: string): boolean {
  const index = readIndex()
  const backup = index.find((b) => b.id === id)
  if (!backup) return false

  const filePath = path.join(BACKUP_DIR, path.basename(backup.filename))
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  writeIndex(index.filter((b) => b.id !== id))
  return true
}

export function restoreBackup(id: string): void {
  const backupPath = getBackupPath(id)
  if (!backupPath) throw new Error('Backup not found')

  // Validate the file is a SQLite database before restoring
  const header = Buffer.alloc(16)
  const fd = fs.openSync(backupPath, 'r')
  fs.readSync(fd, header, 0, 16, 0)
  fs.closeSync(fd)
  if (!header.toString('utf-8', 0, 15).startsWith('SQLite format 3')) {
    throw new Error('Invalid backup file: not a SQLite database')
  }

  const dbPath = getDbPath()

  // Create a pre-restore backup first
  createBackup('pre-delete', 'Auto-backup before restore')

  // Copy backup over current database
  fs.copyFileSync(backupPath, dbPath)
}

export function pruneOldBackups(keepMin = 5, maxAgeDays = 30): number {
  const index = readIndex()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - maxAgeDays)

  // Only prune scheduled backups
  const scheduled = index.filter((b) => b.reason === 'scheduled')
  const other = index.filter((b) => b.reason !== 'scheduled')

  // Sort scheduled by date, newest first
  scheduled.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const toKeep = scheduled.slice(0, keepMin)
  const candidates = scheduled.slice(keepMin)
  const toDelete = candidates.filter((b) => new Date(b.createdAt) < cutoff)

  for (const backup of toDelete) {
    const filePath = path.join(BACKUP_DIR, path.basename(backup.filename))
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }

  const remaining = [...other, ...toKeep, ...candidates.filter((b) => !toDelete.includes(b))]
  writeIndex(remaining)

  return toDelete.length
}
