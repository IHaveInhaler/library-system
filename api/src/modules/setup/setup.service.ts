import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { hashPassword } from '../../lib/password'
import { signAccessToken, signRefreshToken } from '../../lib/jwt'
import { generateShelfLabel } from '../../lib/shelfLabel'
import { fetchByIsbn } from '../../lib/openLibrary'
import { env } from '../../config/env'
import { ForbiddenError, UnauthorizedError, ConflictError } from '../../errors'
import { getSetting } from '../../lib/settings'
import { listBackups } from '../backups/backups.service'

// ── In-memory setup code store ──────────────────────────────────────────────

let activeCode: { code: string; expiresAt: number } | null = null

const SETUP_TOKEN_SECRET = env.JWT_ACCESS_SECRET + ':setup'
const SETUP_TOKEN_EXPIRY = '15m'

// ── Helpers ─────────────────────────────────────────────────────────────────

export async function needsSetup(): Promise<boolean> {
  const completed = await prisma.systemSetting.findUnique({ where: { key: 'setup.completed' } })
  if (completed?.value === 'true') return false
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
  return adminCount === 0
}

async function guardSetup(): Promise<void> {
  if (!(await needsSetup())) {
    throw new ForbiddenError('Setup has already been completed')
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function getStatus() {
  const [devSetting, seededSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: 'dev.enabled' } }),
    prisma.systemSetting.findUnique({ where: { key: 'dev.seeded' } }),
  ])
  const setup = await needsSetup()

  // In development mode, check if there's existing data that could be reused
  let hasExistingData = false
  if (setup && env.NODE_ENV === 'development') {
    const userCount = await prisma.user.count()
    hasExistingData = userCount > 0
  }

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
}

export async function generateCode() {
  await guardSetup()

  const code = crypto.randomInt(100_000, 999_999).toString()
  activeCode = { code, expiresAt: Date.now() + 10 * 60 * 1000 }

  console.log('')
  console.log('╔══════════════════════════════════════════╗')
  console.log('║          LIBRARY PORTAL SETUP            ║')
  console.log('║                                          ║')
  console.log(`║          Setup Code:  ${code}            ║`)
  console.log('║                                          ║')
  console.log('║   Enter this code in the setup wizard.   ║')
  console.log('║   Expires in 10 minutes.                 ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log('')

  return { message: 'Setup code has been printed to the server console.' }
}

export async function verifyCode(code: string) {
  await guardSetup()

  if (!activeCode || Date.now() > activeCode.expiresAt) {
    throw new UnauthorizedError('Invalid or expired setup code')
  }
  // Constant-time comparison to prevent timing attacks
  const expected = Buffer.from(activeCode.code, 'utf8')
  const received = Buffer.from(code.padEnd(expected.length), 'utf8')
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new UnauthorizedError('Invalid or expired setup code')
  }

  // Consume the code
  activeCode = null

  const setupToken = jwt.sign({ purpose: 'setup' }, SETUP_TOKEN_SECRET, {
    algorithm: 'HS256',
    expiresIn: SETUP_TOKEN_EXPIRY,
  } as jwt.SignOptions)

  return { setupToken }
}

// Track consumed setup tokens to prevent reuse
const consumedTokens = new Set<string>()

export function verifySetupToken(token: string): void {
  try {
    const payload = jwt.verify(token, SETUP_TOKEN_SECRET, { algorithms: ['HS256'] }) as { purpose?: string }
    if (payload.purpose !== 'setup') throw new Error()
    if (consumedTokens.has(token)) throw new Error('Token already used')
  } catch {
    throw new UnauthorizedError('Invalid or expired setup token')
  }
}

export function consumeSetupToken(token: string): void {
  consumedTokens.add(token)
}

export async function createAdmin(input: {
  email: string
  password: string
  firstName: string
  lastName: string
}) {
  await guardSetup()

  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) throw new ConflictError('Email already in use')

  const passwordHash = await hashPassword(input.password)

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: 'ADMIN',
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const payload = { sub: user.id, role: user.role }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt },
  })

  return { user, accessToken, refreshToken }
}

export async function resumeExisting() {
  if (env.NODE_ENV !== 'development') {
    throw new ForbiddenError('Resume is only available in development mode')
  }
  const userCount = await prisma.user.count()
  if (userCount === 0) {
    throw new ForbiddenError('No existing data to resume')
  }
  await prisma.systemSetting.upsert({
    where: { key: 'setup.completed' },
    create: { key: 'setup.completed', value: 'true' },
    update: { value: 'true' },
  })
  return { message: 'Resumed with existing database.' }
}

export async function completeSetup() {
  // Ensure built-in membership types exist
  await Promise.all([
    prisma.membershipType.upsert({ where: { name: 'STAFF' }, create: { name: 'STAFF', label: 'Staff', isStaff: true, isBuiltIn: true, order: 1 }, update: {} }),
    prisma.membershipType.upsert({ where: { name: 'PERMANENT' }, create: { name: 'PERMANENT', label: 'Permanent', isBuiltIn: false, order: 2 }, update: {} }),
    prisma.membershipType.upsert({ where: { name: 'YEARLY' }, create: { name: 'YEARLY', label: 'Yearly', durationDays: 365, isBuiltIn: false, order: 3 }, update: {} }),
    prisma.membershipType.upsert({ where: { name: 'MONTHLY' }, create: { name: 'MONTHLY', label: 'Monthly', durationDays: 30, isBuiltIn: false, order: 4 }, update: {} }),
  ])

  await prisma.systemSetting.upsert({
    where: { key: 'setup.completed' },
    create: { key: 'setup.completed', value: 'true' },
    update: { value: 'true' },
  })
  return { message: 'Setup complete.' }
}

export async function setDevMode(enabled: boolean) {
  if (process.env.NODE_ENV !== 'development') {
    throw new ForbiddenError('Developer mode is only available in development environments')
  }
  await prisma.systemSetting.upsert({
    where: { key: 'dev.enabled' },
    create: { key: 'dev.enabled', value: enabled ? 'true' : 'false' },
    update: { value: enabled ? 'true' : 'false' },
  })
  return { devMode: enabled }
}

export async function devSeed() {
  // Only allow dev seed during initial setup (no admin exists yet) or when dev mode is enabled
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
  if (adminCount > 0) {
    const devEnabled = await getSetting('dev.enabled')
    if (devEnabled !== 'true') {
      throw new ForbiddenError('Dev seed requires dev mode to be enabled (or run during initial setup)')
    }
  }

  // Ensure built-in membership types exist (they're inserted by migration but deleted by factory reset)
  await Promise.all([
    prisma.membershipType.upsert({ where: { name: 'STAFF' }, create: { name: 'STAFF', label: 'Staff', isStaff: true, isBuiltIn: true, order: 1 }, update: {} }),
    prisma.membershipType.upsert({ where: { name: 'PERMANENT' }, create: { name: 'PERMANENT', label: 'Permanent', isBuiltIn: false, order: 2 }, update: {} }),
    prisma.membershipType.upsert({ where: { name: 'YEARLY' }, create: { name: 'YEARLY', label: 'Yearly', durationDays: 365, isBuiltIn: false, order: 3 }, update: {} }),
    prisma.membershipType.upsert({ where: { name: 'MONTHLY' }, create: { name: 'MONTHLY', label: 'Monthly', durationDays: 30, isBuiltIn: false, order: 4 }, update: {} }),
  ])

  // Seed dev accounts, libraries, shelves, books
  const [adminHash, librarianHash, memberHash] = await Promise.all([
    bcrypt.hash('Admin1234!', 12),
    bcrypt.hash('Librarian1!', 12),
    bcrypt.hash('Member123!', 12),
  ])

  const [admin, librarian, member] = await Promise.all([
    prisma.user.create({
      data: { email: 'admin@library.com', passwordHash: adminHash, firstName: 'Admin', lastName: 'User', role: 'ADMIN' },
    }),
    prisma.user.create({
      data: { email: 'librarian@library.com', passwordHash: librarianHash, firstName: 'Jane', lastName: 'Doe', role: 'LIBRARIAN' },
    }),
    prisma.user.create({
      data: { email: 'member@library.com', passwordHash: memberHash, firstName: 'John', lastName: 'Smith', role: 'MEMBER' },
    }),
  ])

  // Ensure LIBRARIAN and MEMBER groups exist
  for (const g of [
    { name: 'ADMIN', description: 'Full system access', isBuiltIn: true, order: 1 },
    { name: 'LIBRARIAN', description: 'Manage books, loans, shelves, and members', isBuiltIn: false, order: 2 },
    { name: 'MEMBER', description: 'Browse catalogue, place reservations', isBuiltIn: false, order: 3 },
  ]) {
    await prisma.group.upsert({
      where: { name: g.name },
      create: g,
      update: {},
    })
  }

  const [centralLib, westLib] = await Promise.all([
    prisma.library.create({ data: { name: 'Central City Library', labelPrefix: 'CEN', email: 'central@library.com', isPrivate: false } }),
    prisma.library.create({ data: { name: 'West Branch Library', labelPrefix: 'WST', email: 'west@library.com', isPrivate: false } }),
  ])

  const monthEnd = new Date()
  monthEnd.setMonth(monthEnd.getMonth() + 1)

  await Promise.all([
    // Admin: staff at both libraries
    prisma.libraryMembership.create({ data: { userId: admin.id, libraryId: centralLib.id, membershipType: 'STAFF' } }),
    prisma.libraryMembership.create({ data: { userId: admin.id, libraryId: westLib.id, membershipType: 'STAFF' } }),
    // Librarian: staff at both libraries
    prisma.libraryMembership.create({ data: { userId: librarian.id, libraryId: centralLib.id, membershipType: 'STAFF' } }),
    prisma.libraryMembership.create({ data: { userId: librarian.id, libraryId: westLib.id, membershipType: 'STAFF' } }),
    // Member: permanent @ Central, monthly @ West
    prisma.libraryMembership.create({ data: { userId: member.id, libraryId: centralLib.id, membershipType: 'PERMANENT' } }),
    prisma.libraryMembership.create({ data: { userId: member.id, libraryId: westLib.id, membershipType: 'MONTHLY', endDate: monthEnd } }),
  ])

  const shelf1 = await prisma.shelf.create({ data: { code: 'FIC-01', label: await generateShelfLabel('CEN', 'L'), position: 'L', genre: 'FICTION', location: 'Ground floor, north wing', libraryId: centralLib.id } })
  const shelf2 = await prisma.shelf.create({ data: { code: 'SCI-01', label: await generateShelfLabel('CEN', 'M'), position: 'M', genre: 'SCIENCE', location: 'First floor, east wing', libraryId: centralLib.id } })
  const shelf3 = await prisma.shelf.create({ data: { code: 'TECH-01', label: await generateShelfLabel('CEN', 'R'), position: 'R', genre: 'TECHNOLOGY', location: 'First floor, east wing', libraryId: centralLib.id } })
  const shelf4 = await prisma.shelf.create({ data: { code: 'FIC-01', label: await generateShelfLabel('WST', 'L'), position: 'L', genre: 'FICTION', location: 'Ground floor, main hall', libraryId: westLib.id } })

  // Seed books by ISBN — fetch metadata from Open Library for covers + descriptions
  const seedIsbns = [
    { isbn: '9780743273565', genre: 'FICTION', fallback: { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' } },
    { isbn: '9780374529550', genre: 'SCIENCE', fallback: { title: 'A Brief History of Time', author: 'Stephen Hawking' } },
    { isbn: '9780134685991', genre: 'TECHNOLOGY', fallback: { title: 'The Pragmatic Programmer', author: 'David Thomas, Andrew Hunt' } },
  ]

  const books = []
  for (const { isbn, genre, fallback } of seedIsbns) {
    let data: any = null
    try {
      const meta = await fetchByIsbn(isbn)
      if (meta) {
        data = { isbn: meta.isbn, title: meta.title, author: meta.author, publisher: meta.publisher, publishedYear: meta.publishedYear, genre, description: meta.description, coverUrl: meta.coverUrl, totalPages: meta.totalPages, language: meta.language }
      }
    } catch (err) {
      console.log(`[Dev seed] ISBN lookup failed for ${isbn}, using fallback: ${err instanceof Error ? err.message : 'unknown'}`)
    }
    if (!data) {
      data = { isbn, title: fallback.title, author: fallback.author, genre, language: 'en' }
    }
    try {
      books.push(await prisma.book.create({ data }))
    } catch (err) {
      console.log(`[Dev seed] Failed to create book ${isbn}: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }
  const [book1, book2, book3] = books

  const [copy1] = await Promise.all([
    prisma.bookCopy.create({ data: { barcode: 'CC-GG-001', bookId: book1.id, shelfId: shelf1.id } }),
    prisma.bookCopy.create({ data: { barcode: 'CC-GG-002', bookId: book1.id, shelfId: shelf1.id } }),
    prisma.bookCopy.create({ data: { barcode: 'WB-GG-001', bookId: book1.id, shelfId: shelf4.id } }),
    prisma.bookCopy.create({ data: { barcode: 'CC-BHT-001', bookId: book2.id, shelfId: shelf2.id } }),
    prisma.bookCopy.create({ data: { barcode: 'CC-PP-001', bookId: book3.id, shelfId: shelf3.id } }),
    prisma.bookCopy.create({ data: { barcode: 'CC-PP-002', bookId: book3.id, shelfId: shelf3.id } }),
  ])

  // Overdue loan for member (for testing the overdue banner)
  const overdueDue = new Date()
  overdueDue.setDate(overdueDue.getDate() - 7)
  await prisma.loan.create({
    data: {
      userId: member.id,
      bookCopyId: copy1.id,
      issuedById: admin.id,
      borrowedAt: new Date(overdueDue.getTime() - 14 * 24 * 60 * 60 * 1000),
      dueDate: overdueDue,
      status: 'OVERDUE',
      notes: 'Seeded overdue loan for testing',
      notesEditedBy: JSON.stringify([{ id: admin.id, name: 'admin@library.com', at: new Date().toISOString() }]),
      conditionAtCheckout: 'GOOD',
    },
  })
  await prisma.bookCopy.update({ where: { id: copy1.id }, data: { status: 'ON_LOAN' } })

  // Seed copy.conditions setting
  await prisma.systemSetting.upsert({
    where: { key: 'copy.conditions' },
    create: { key: 'copy.conditions', value: JSON.stringify(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']) },
    update: {},
  })

  // Enable dev mode + mark seeded + mark setup complete
  await Promise.all([
    prisma.systemSetting.upsert({ where: { key: 'dev.enabled' }, create: { key: 'dev.enabled', value: 'true' }, update: { value: 'true' } }),
    prisma.systemSetting.upsert({ where: { key: 'dev.seeded' }, create: { key: 'dev.seeded', value: 'true' }, update: { value: 'true' } }),
    prisma.systemSetting.upsert({ where: { key: 'setup.completed' }, create: { key: 'setup.completed', value: 'true' }, update: { value: 'true' } }),
  ])

  // Return admin auth tokens so the frontend can log in directly
  const payload = { sub: admin.id, role: admin.role }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: admin.id, expiresAt } })

  return {
    user: { id: admin.id, email: admin.email, firstName: admin.firstName, lastName: admin.lastName, role: admin.role, isActive: admin.isActive, createdAt: admin.createdAt.toISOString(), updatedAt: admin.updatedAt.toISOString() },
    accessToken,
    refreshToken,
    message: 'Dev environment seeded.',
  }
}

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

export async function factoryReset() {
  // Auto-backup before factory reset
  try {
    const { createBackup } = await import('../backups/backups.service')
    await createBackup('pre-delete', 'Before factory reset')
  } catch (err) {
    console.error('[Backup] Pre-reset backup failed:', err)
  }

  // Delete all data in dependency order
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.bookNote.deleteMany(),
    prisma.securityKey.deleteMany(),
    prisma.emailVerification.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.reservation.deleteMany(),
    prisma.damageReport.deleteMany(),
    prisma.loan.deleteMany(),
    prisma.bookCopy.deleteMany(),
    prisma.book.deleteMany(),
    prisma.shelf.deleteMany(),
    prisma.libraryMembership.deleteMany(),
    prisma.library.deleteMany(),
    prisma.membershipType.deleteMany({ where: { isBuiltIn: false } }),
    prisma.rolePermission.deleteMany(),
    prisma.group.deleteMany(),
    prisma.user.deleteMany(),
    prisma.systemSetting.deleteMany(),
  ])

  return { message: 'Factory reset complete. System is ready for setup.' }
}
