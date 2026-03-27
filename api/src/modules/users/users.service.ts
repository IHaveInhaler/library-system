import crypto from 'crypto'
import { prisma } from '../../lib/prisma'
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '../../errors'
import { hashPassword } from '../../lib/password'
import { hasPermission } from '../../lib/permissions'
import { getSetting } from '../../lib/settings'
import { sendPasswordResetEmail, sendAccountCreatedEmail } from '../../lib/mailer'
import { CreateUserInput, UpdateUserInput, UsersQueryInput } from './users.schemas'

const safeSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  emailVerified: true,
  deactivationReason: true,
  activationReason: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) throw new ConflictError('A user with that email already exists')

  // Create with a random unusable password — user will set their own via the invite link
  const placeholder = crypto.randomBytes(32).toString('hex')
  const passwordHash = await hashPassword(placeholder)

  const user = await prisma.user.create({
    data: { email: input.email, passwordHash, firstName: input.firstName, lastName: input.lastName, role: input.role },
    select: safeSelect,
  })

  // Generate a "set password" token (24h expiry) and send invite email
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } })

  const baseUrl = (await getSetting('app.baseUrl')) || process.env.CORS_ORIGIN || 'http://localhost:5173'
  const setPasswordLink = `${baseUrl}/reset-password?token=${token}`

  await sendAccountCreatedEmail(user.email, setPasswordLink)

  return user
}

export async function listUsers(query: UsersQueryInput) {
  const { page, limit, role, isActive, search } = query
  const skip = (page - 1) * limit

  const where = {
    ...(role && { role }),
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ],
    }),
  }

  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select: safeSelect, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ])

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: safeSelect })
  if (!user) throw new NotFoundError('User')
  return user
}

export async function updateUser(id: string, input: UpdateUserInput, callerId?: string, callerRole?: string) {
  const target = await getUser(id)
  if (callerId && callerId === id && input.role !== undefined) {
    throw new BadRequestError('You cannot change your own role')
  }

  // Rank hierarchy: non-ADMIN callers can only manage users with lower rank (higher order number)
  if (callerRole && callerRole !== 'ADMIN') {
    const callerGroup = await prisma.group.findUnique({ where: { name: callerRole } })
    if (callerGroup) {
      // Caller cannot manage a user whose role is equal or higher rank (lower order)
      const targetGroup = await prisma.group.findUnique({ where: { name: target.role } })
      if (targetGroup && targetGroup.order <= callerGroup.order) {
        throw new ForbiddenError('You cannot manage users with equal or higher rank than yours')
      }

      // Caller cannot assign a role of equal or higher rank
      if (input.role) {
        const newRoleGroup = await prisma.group.findUnique({ where: { name: input.role } })
        if (newRoleGroup && newRoleGroup.order <= callerGroup.order) {
          throw new ForbiddenError('You cannot assign a role with equal or higher rank than yours')
        }
      }
    }
  }

  return prisma.user.update({ where: { id }, data: input, select: safeSelect })
}

export async function setUserActive(id: string, isActive: boolean, reason?: string) {
  await getUser(id)
  return prisma.user.update({
    where: { id },
    data: {
      isActive,
      deactivationReason: isActive ? null : (reason ?? null),
      activationReason: isActive ? (reason ?? null) : null,
    },
    select: safeSelect,
  })
}

export async function revokeUserSessions(id: string) {
  await getUser(id)
  await prisma.refreshToken.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } })
}

export async function deleteUser(id: string) {
  await getUser(id)
  await prisma.refreshToken.deleteMany({ where: { userId: id } })
  return prisma.user.delete({ where: { id } })
}

export async function resetUserPassword(id: string): Promise<{ message: string }> {
  const user = await getUser(id)

  // Replace password with a random unusable hash so the user can't log in until they set a new one
  const placeholder = crypto.randomBytes(32).toString('hex')
  const passwordHash = await hashPassword(placeholder)
  await prisma.user.update({ where: { id }, data: { passwordHash } })

  // Revoke all sessions
  await prisma.refreshToken.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } })

  // Invalidate any existing unused reset tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: id, usedAt: null },
    data: { usedAt: new Date() },
  })

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordResetToken.create({ data: { userId: id, token, expiresAt } })

  const baseUrl = (await getSetting('app.baseUrl')) || process.env.CORS_ORIGIN || 'http://localhost:5173'
  const resetLink = `${baseUrl}/reset-password?token=${token}`

  await sendPasswordResetEmail(user.email, resetLink)

  return { message: 'Password reset link sent.' }
}

export async function getUserLoans(userId: string, callerId: string, callerRole: string) {
  await getUser(userId)

  if (callerId !== userId && callerRole !== 'ADMIN') {
    const canView = await hasPermission(callerRole, 'VIEW_USERS')
    if (!canView) throw new ForbiddenError('You can only view your own loans')
  }

  return prisma.loan.findMany({
    where: { userId },
    include: {
      bookCopy: {
        include: {
          book: { select: { id: true, title: true, author: true, isbn: true } },
          shelf: { include: { library: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: { borrowedAt: 'desc' },
  })
}

export async function getUserReservations(userId: string, callerId: string, callerRole: string) {
  await getUser(userId)

  if (callerId !== userId && callerRole !== 'ADMIN') {
    const canView = await hasPermission(callerRole, 'VIEW_USERS')
    if (!canView) throw new ForbiddenError('You can only view your own reservations')
  }

  return prisma.reservation.findMany({
    where: { userId },
    include: {
      book: { select: { id: true, title: true, author: true, isbn: true } },
      bookCopy: true,
    },
    orderBy: { reservedAt: 'desc' },
  })
}
