import { prisma } from '../../lib/prisma'
import { NotFoundError, ForbiddenError, ConflictError } from '../../errors'
import { hashPassword } from '../../lib/password'
import { CreateUserInput, UpdateUserInput, UsersQueryInput } from './users.schemas'

const safeSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) throw new ConflictError('A user with that email already exists')

  const passwordHash = await hashPassword(input.password)
  return prisma.user.create({
    data: { email: input.email, passwordHash, firstName: input.firstName, lastName: input.lastName, role: input.role },
    select: safeSelect,
  })
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

export async function updateUser(id: string, input: UpdateUserInput) {
  await getUser(id)
  return prisma.user.update({ where: { id }, data: input, select: safeSelect })
}

export async function deleteUser(id: string) {
  await getUser(id)
  return prisma.user.update({ where: { id }, data: { isActive: false }, select: safeSelect })
}

export async function getUserLoans(userId: string, callerId: string, callerRole: string) {
  await getUser(userId)

  if (callerRole === 'MEMBER' && callerId !== userId) {
    throw new ForbiddenError('You can only view your own loans')
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

  if (callerRole === 'MEMBER' && callerId !== userId) {
    throw new ForbiddenError('You can only view your own reservations')
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
