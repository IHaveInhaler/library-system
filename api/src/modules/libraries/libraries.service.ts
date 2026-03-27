import { prisma } from '../../lib/prisma'
import { ForbiddenError, NotFoundError } from '../../errors/index'
import { CreateLibraryInput, UpdateLibraryInput, LibraryQueryInput } from './libraries.schemas'
import { getAccessibleLibraryIds } from '../../lib/libraryAccess'
import { hasPermission } from '../../lib/permissions'

async function resolveAccess(userId?: string, userRole?: string) {
  if (!userId || !userRole) return { canViewPublic: true, canViewAll: false }
  const [canViewAll, canViewPublic] = await Promise.all([
    hasPermission(userRole, 'VIEW_ALL_LIBRARIES'),
    hasPermission(userRole, 'VIEW_LIBRARIES'),
  ])
  return { canViewPublic, canViewAll }
}

export async function listLibraries(query: LibraryQueryInput, userId?: string, userRole?: string) {
  const { page, limit, search } = query
  const skip = (page - 1) * limit

  const { canViewPublic, canViewAll } = await resolveAccess(userId, userRole)
  const accessibleIds = await getAccessibleLibraryIds(userId, userRole, canViewPublic, canViewAll)

  const where = {
    isActive: true,
    ...(accessibleIds && { id: { in: accessibleIds } }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
      ],
    }),
  }

  const [data, total] = await prisma.$transaction([
    prisma.library.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.library.count({ where }),
  ])

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getLibrary(id: string, userId?: string, userRole?: string) {
  const library = await prisma.library.findUnique({
    where: { id },
    include: { _count: { select: { shelves: true } } },
  })
  if (!library) throw new NotFoundError('Library')

  const { canViewPublic, canViewAll } = await resolveAccess(userId, userRole)
  const accessibleIds = await getAccessibleLibraryIds(userId, userRole, canViewPublic, canViewAll)

  // Restricted: must be in the accessible set
  if (accessibleIds && !accessibleIds.includes(id)) {
    throw new ForbiddenError(library.isPrivate ? 'This library is private' : 'You need a membership to access this library')
  }

  return library
}

export async function createLibrary(input: CreateLibraryInput) {
  return prisma.library.create({ data: input })
}

export async function updateLibrary(id: string, input: UpdateLibraryInput) {
  await prisma.library.findUniqueOrThrow({ where: { id } })
  return prisma.library.update({ where: { id }, data: input })
}

export async function deleteLibrary(id: string) {
  await prisma.library.findUniqueOrThrow({ where: { id } })
  return prisma.library.update({ where: { id }, data: { isActive: false } })
}

export async function getLibraryShelves(libraryId: string, userId?: string, userRole?: string) {
  await getLibrary(libraryId, userId, userRole)
  return prisma.shelf.findMany({
    where: { libraryId },
    include: { _count: { select: { bookCopies: true } } },
    orderBy: { code: 'asc' },
  })
}
