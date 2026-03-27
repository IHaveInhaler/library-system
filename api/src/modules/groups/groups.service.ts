import { prisma } from '../../lib/prisma'
import { PERMISSIONS, LIBRARIAN_DEFAULTS, MEMBER_DEFAULTS } from '../../lib/permissions'
import { NotFoundError, BadRequestError, ConflictError } from '../../errors'
import { CreateGroupInput, UpdateGroupInput, ReorderGroupsInput } from './groups.schemas'

const BUILT_IN_GROUPS = [
  { name: 'ADMIN', order: 1 },
  { name: 'LIBRARIAN', order: 2 },
  { name: 'MEMBER', order: 3 },
] as const

async function ensureBuiltInsExist() {
  for (const { name, order } of BUILT_IN_GROUPS) {
    await prisma.group.upsert({
      where: { name },
      update: { order },
      create: { name, isBuiltIn: true, order },
    })
  }
}

export async function listGroups() {
  await ensureBuiltInsExist()

  const groups = await prisma.group.findMany({ orderBy: { order: 'asc' } })
  const permRecords = await prisma.rolePermission.findMany()

  return groups.map((g) => {
    const perms: Record<string, boolean> = {}
    for (const perm of PERMISSIONS) {
      const record = permRecords.find((r) => r.role === g.name && r.permission === perm)
      if (record !== undefined) {
        perms[perm] = record.granted
      } else {
        if (g.name === 'ADMIN') {
          perms[perm] = true
        } else if (g.name === 'LIBRARIAN') {
          perms[perm] = (LIBRARIAN_DEFAULTS as string[]).includes(perm)
        } else if (g.name === 'MEMBER') {
          perms[perm] = (MEMBER_DEFAULTS as string[]).includes(perm)
        } else {
          perms[perm] = false
        }
      }
    }
    return { ...g, permissions: perms }
  })
}

export async function createGroup(input: CreateGroupInput) {
  const builtInNames = BUILT_IN_GROUPS.map((g) => g.name) as readonly string[]
  if (builtInNames.includes(input.name)) {
    throw new ConflictError(`Group "${input.name}" is a built-in group`)
  }

  const existing = await prisma.group.findUnique({ where: { name: input.name } })
  if (existing) throw new ConflictError(`Group "${input.name}" already exists`)

  // Place new group after all existing groups
  const maxOrder = await prisma.group.aggregate({ _max: { order: true } })
  const order = (maxOrder._max.order ?? 0) + 1

  return prisma.group.create({
    data: { name: input.name, description: input.description, isBuiltIn: false, order },
  })
}

export async function updateGroup(name: string, input: UpdateGroupInput) {
  const group = await prisma.group.findUnique({ where: { name } })
  if (!group) throw new NotFoundError('Group')
  if (group.isBuiltIn && input.name !== undefined) {
    throw new BadRequestError('Built-in groups cannot be renamed')
  }

  if (input.name && input.name !== name) {
    const conflict = await prisma.group.findUnique({ where: { name: input.name } })
    if (conflict) throw new ConflictError(`Group "${input.name}" already exists`)

    // Rename: update group name and all users/permissions that reference this role
    return prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { role: name }, data: { role: input.name! } })
      await tx.rolePermission.updateMany({ where: { role: name }, data: { role: input.name! } })
      return tx.group.update({
        where: { name },
        data: { name: input.name, description: input.description },
      })
    })
  }

  return prisma.group.update({
    where: { name },
    data: { description: input.description },
  })
}

export async function reorderGroups(input: ReorderGroupsInput) {
  const { names } = input

  // Validate all names exist
  const groups = await prisma.group.findMany({ where: { name: { in: names } } })
  if (groups.length !== names.length) {
    throw new BadRequestError('One or more group names are invalid')
  }

  // Assign sequential order values
  await prisma.$transaction(
    names.map((name, idx) =>
      prisma.group.update({ where: { name }, data: { order: idx + 1 } })
    )
  )
}

export async function deleteGroup(name: string) {
  const group = await prisma.group.findUnique({ where: { name } })
  if (!group) throw new NotFoundError('Group')
  if (group.isBuiltIn) throw new BadRequestError('Built-in groups cannot be deleted')

  const usersInGroup = await prisma.user.count({ where: { role: name } })
  if (usersInGroup > 0) {
    throw new BadRequestError(`Cannot delete group "${name}" — ${usersInGroup} user(s) are assigned to it`)
  }

  await prisma.rolePermission.deleteMany({ where: { role: name } })
  await prisma.group.delete({ where: { name } })
}
