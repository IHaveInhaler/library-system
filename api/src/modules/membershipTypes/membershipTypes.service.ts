import { prisma } from '../../lib/prisma'
import { ConflictError, BadRequestError, NotFoundError } from '../../errors'
import { CreateMembershipTypeInput, UpdateMembershipTypeInput } from './membershipTypes.schemas'

export async function listMembershipTypes() {
  return prisma.membershipType.findMany({ orderBy: { order: 'asc' } })
}

export async function createMembershipType(input: CreateMembershipTypeInput) {
  const existing = await prisma.membershipType.findUnique({ where: { name: input.name } })
  if (existing) throw new ConflictError(`Membership type "${input.name}" already exists`)

  const maxOrder = await prisma.membershipType.aggregate({ _max: { order: true } })
  const order = (maxOrder._max.order ?? 0) + 1

  return prisma.membershipType.create({
    data: {
      name: input.name,
      label: input.label,
      durationDays: input.durationDays ?? null,
      isStaff: input.isStaff ?? false,
      order,
    },
  })
}

export async function updateMembershipType(id: string, input: UpdateMembershipTypeInput) {
  const type = await prisma.membershipType.findUnique({ where: { id } })
  if (!type) throw new NotFoundError('Membership type')

  // Cannot change isStaff on built-in STAFF type
  if (type.isBuiltIn && type.isStaff && input.isStaff === false) {
    throw new BadRequestError('Cannot remove staff flag from the built-in Staff type')
  }

  return prisma.membershipType.update({
    where: { id },
    data: {
      ...(input.label !== undefined && { label: input.label }),
      ...(input.durationDays !== undefined && { durationDays: input.durationDays }),
      ...(input.isStaff !== undefined && { isStaff: input.isStaff }),
    },
  })
}

export async function deleteMembershipType(id: string) {
  const type = await prisma.membershipType.findUnique({ where: { id } })
  if (!type) throw new NotFoundError('Membership type')
  if (type.isBuiltIn) throw new BadRequestError('Cannot delete a built-in membership type')

  const usageCount = await prisma.libraryMembership.count({ where: { membershipType: type.name } })
  if (usageCount > 0) throw new BadRequestError(`Cannot delete — ${usageCount} membership(s) use this type`)

  return prisma.membershipType.delete({ where: { id } })
}

export async function reorderMembershipTypes(ids: string[]) {
  await Promise.all(
    ids.map((id, index) =>
      prisma.membershipType.update({ where: { id }, data: { order: index + 1 } })
    )
  )
}
