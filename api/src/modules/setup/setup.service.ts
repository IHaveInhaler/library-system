import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { hashPassword } from '../../lib/password'
import { signAccessToken, signRefreshToken } from '../../lib/jwt'
import { generateShelfLabel } from '../../lib/shelfLabel'
import { env } from '../../config/env'
import { ForbiddenError, UnauthorizedError, ConflictError } from '../../errors'

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

  return {
    needsSetup: setup,
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

  if (!activeCode || Date.now() > activeCode.expiresAt || activeCode.code !== code) {
    throw new UnauthorizedError('Invalid or expired setup code')
  }

  // Consume the code
  activeCode = null

  const setupToken = jwt.sign({ purpose: 'setup' }, SETUP_TOKEN_SECRET, {
    expiresIn: SETUP_TOKEN_EXPIRY,
  } as jwt.SignOptions)

  return { setupToken }
}

export function verifySetupToken(token: string): void {
  try {
    const payload = jwt.verify(token, SETUP_TOKEN_SECRET) as { purpose?: string }
    if (payload.purpose !== 'setup') throw new Error()
  } catch {
    throw new UnauthorizedError('Invalid or expired setup token')
  }
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
  await prisma.systemSetting.upsert({
    where: { key: 'setup.completed' },
    create: { key: 'setup.completed', value: 'true' },
    update: { value: 'true' },
  })
  return { message: 'Setup complete.' }
}

export async function setDevMode(enabled: boolean) {
  await prisma.systemSetting.upsert({
    where: { key: 'dev.enabled' },
    create: { key: 'dev.enabled', value: enabled ? 'true' : 'false' },
    update: { value: enabled ? 'true' : 'false' },
  })
  return { devMode: enabled }
}

export async function devSeed() {
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
    prisma.library.create({ data: { name: 'Central City Library', labelPrefix: 'CEN', email: 'central@library.com', isPrivate: true } }),
    prisma.library.create({ data: { name: 'West Branch Library', labelPrefix: 'WST', email: 'west@library.com', isPrivate: true } }),
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

  const [shelf1, shelf2, shelf3, shelf4] = await Promise.all([
    prisma.shelf.create({ data: { code: 'FIC-01', label: generateShelfLabel('CEN', 'L'), position: 'L', genre: 'FICTION', location: 'Ground floor, north wing', libraryId: centralLib.id } }),
    prisma.shelf.create({ data: { code: 'SCI-01', label: generateShelfLabel('CEN', 'M'), position: 'M', genre: 'SCIENCE', location: 'First floor, east wing', libraryId: centralLib.id } }),
    prisma.shelf.create({ data: { code: 'TECH-01', label: generateShelfLabel('CEN', 'R'), position: 'R', genre: 'TECHNOLOGY', location: 'First floor, east wing', libraryId: centralLib.id } }),
    prisma.shelf.create({ data: { code: 'FIC-01', label: generateShelfLabel('WST', 'L'), position: 'L', genre: 'FICTION', location: 'Ground floor, main hall', libraryId: westLib.id } }),
  ])

  const [book1, book2, book3] = await Promise.all([
    prisma.book.create({ data: { isbn: '9780743273565', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', publisher: 'Scribner', publishedYear: 1925, genre: 'FICTION', description: 'A novel about Jay Gatsby.', totalPages: 180 } }),
    prisma.book.create({ data: { isbn: '9780374529550', title: 'A Brief History of Time', author: 'Stephen Hawking', publisher: 'Bantam Books', publishedYear: 1988, genre: 'SCIENCE', description: 'Origins and fate of the universe.', totalPages: 212 } }),
    prisma.book.create({ data: { isbn: '9780134685991', title: 'The Pragmatic Programmer', author: 'David Thomas, Andrew Hunt', publisher: 'Addison-Wesley', publishedYear: 2019, genre: 'TECHNOLOGY', description: 'Essential software development wisdom.', totalPages: 352 } }),
  ])

  await Promise.all([
    prisma.bookCopy.create({ data: { barcode: 'CC-GG-001', bookId: book1.id, shelfId: shelf1.id } }),
    prisma.bookCopy.create({ data: { barcode: 'CC-GG-002', bookId: book1.id, shelfId: shelf1.id } }),
    prisma.bookCopy.create({ data: { barcode: 'WB-GG-001', bookId: book1.id, shelfId: shelf4.id } }),
    prisma.bookCopy.create({ data: { barcode: 'CC-BHT-001', bookId: book2.id, shelfId: shelf2.id } }),
    prisma.bookCopy.create({ data: { barcode: 'CC-PP-001', bookId: book3.id, shelfId: shelf3.id } }),
    prisma.bookCopy.create({ data: { barcode: 'CC-PP-002', bookId: book3.id, shelfId: shelf3.id } }),
  ])

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

export async function factoryReset() {
  // Delete all data in dependency order
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.emailVerification.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.reservation.deleteMany(),
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
