import { prisma } from '../../lib/prisma'
import { NotFoundError } from '../../errors/index'
import { CreateMembershipInput, UpdateMembershipInput } from './memberships.schemas'

export async function listMemberships(libraryId: string) {
  return prisma.libraryMembership.findMany({
    where: { libraryId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      type: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getMyMembership(libraryId: string, userId: string) {
  const now = new Date()
  return prisma.libraryMembership.findFirst({
    where: {
      libraryId,
      userId,
      isActive: true,
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
  })
}

export async function createMembership(libraryId: string, input: CreateMembershipInput) {
  const library = await prisma.library.findUnique({ where: { id: libraryId } })
  if (!library) throw new NotFoundError('Library')

  const user = await prisma.user.findUnique({ where: { id: input.userId } })
  if (!user) throw new NotFoundError('User')

  const existing = await prisma.libraryMembership.findUnique({
    where: { userId_libraryId: { userId: input.userId, libraryId } },
  })

  // Auto-compute endDate from MembershipType duration if not provided
  let endDate = input.endDate
  if (!endDate && input.membershipType) {
    const mType = await prisma.membershipType.findUnique({ where: { name: input.membershipType } })
    if (mType) {
      const start = new Date(input.startDate ?? new Date())
      if (mType.durationMonths) {
        // Calendar month addition (e.g. Jan 10 + 1 month = Feb 10)
        endDate = new Date(start)
        endDate.setMonth(endDate.getMonth() + mType.durationMonths)
      } else if (mType.durationDays) {
        endDate = new Date(start)
        endDate.setDate(endDate.getDate() + mType.durationDays)
      }
    }
  }

  // If a membership (even revoked) already exists, reactivate/update it instead of creating
  if (existing) {
    return prisma.libraryMembership.update({
      where: { userId_libraryId: { userId: input.userId, libraryId } },
      data: {
        membershipType: input.membershipType ?? existing.membershipType,
        startDate: input.startDate ?? new Date(),
        endDate: endDate ?? null,
        notes: input.notes ?? existing.notes,
        isActive: true,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })
  }

  return prisma.libraryMembership.create({
    data: {
      userId: input.userId,
      libraryId,
      membershipType: input.membershipType ?? 'PERMANENT',
      startDate: input.startDate,
      endDate,
      notes: input.notes,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  })
}

export async function updateMembership(libraryId: string, userId: string, input: UpdateMembershipInput) {
  const membership = await prisma.libraryMembership.findUnique({
    where: { userId_libraryId: { userId, libraryId } },
  })
  if (!membership) throw new NotFoundError('Membership')

  return prisma.libraryMembership.update({
    where: { userId_libraryId: { userId, libraryId } },
    data: input,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  })
}

export async function removeMembership(libraryId: string, userId: string) {
  const membership = await prisma.libraryMembership.findUnique({
    where: { userId_libraryId: { userId, libraryId } },
  })
  if (!membership) throw new NotFoundError('Membership')

  return prisma.libraryMembership.delete({
    where: { userId_libraryId: { userId, libraryId } },
  })
}
