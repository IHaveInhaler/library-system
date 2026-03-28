import { prisma } from '../../lib/prisma'
import { ForbiddenError, NotFoundError, BadRequestError } from '../../errors/index'
import { CreateLibraryInput, UpdateLibraryInput, LibraryQueryInput } from './libraries.schemas'
import { getAccessibleLibraryIds } from '../../lib/libraryAccess'
import { hasPermission } from '../../lib/permissions'
import { generateShelfLabel, ShelfPosition } from '../../lib/shelfLabel'

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

export async function getLibrary(idOrPrefix: string, userId?: string, userRole?: string) {
  // Try by UUID first, then by labelPrefix (case-insensitive)
  let library = await prisma.library.findUnique({
    where: { id: idOrPrefix },
    include: { _count: { select: { shelves: true } } },
  })
  if (!library) {
    library = await prisma.library.findUnique({
      where: { labelPrefix: idOrPrefix.toUpperCase() },
      include: { _count: { select: { shelves: true } } },
    })
  }
  if (!library) throw new NotFoundError('Library')
  const id = library.id

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

async function generateUniqueLabelForPrefix(prefix: string, position: ShelfPosition): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const label = generateShelfLabel(prefix, position)
    const existing = await prisma.shelf.findUnique({ where: { label } })
    if (!existing) return label
  }
  throw new Error('Could not generate a unique shelf label')
}

export async function updateLibrary(id: string, input: UpdateLibraryInput) {
  const library = await prisma.library.findUniqueOrThrow({ where: { id } })

  // If labelPrefix is changing, regenerate all shelf labels for this library
  if (input.labelPrefix && input.labelPrefix !== library.labelPrefix) {
    const shelves = await prisma.shelf.findMany({ where: { libraryId: id } })
    await Promise.all(
      shelves.map(async (shelf) => {
        const newLabel = await generateUniqueLabelForPrefix(input.labelPrefix!, shelf.position as ShelfPosition)
        await prisma.shelf.update({ where: { id: shelf.id }, data: { label: newLabel } })
      })
    )
  }

  return prisma.library.update({ where: { id }, data: input })
}

export async function deleteLibrary(id: string, opts?: { action?: 'move' | 'delete'; targetLibraryId?: string }) {
  const library = await prisma.library.findUniqueOrThrow({ where: { id } })
  const action = opts?.action ?? 'deactivate'

  if (action === 'move') {
    if (!opts?.targetLibraryId) throw new BadRequestError('targetLibraryId is required for move action')
    if (opts.targetLibraryId === id) throw new BadRequestError('Cannot move shelves to the same library')

    const target = await prisma.library.findUnique({ where: { id: opts.targetLibraryId } })
    if (!target) throw new NotFoundError('Target library')

    // Reassign all shelves to target library with new labels
    const shelves = await prisma.shelf.findMany({ where: { libraryId: id } })
    await Promise.all(
      shelves.map(async (shelf) => {
        const newLabel = await generateUniqueLabelForPrefix(target.labelPrefix, shelf.position as ShelfPosition)
        await prisma.shelf.update({
          where: { id: shelf.id },
          data: { libraryId: opts.targetLibraryId!, label: newLabel },
        })
      })
    )

    // Now hard delete the empty library
    await prisma.libraryMembership.deleteMany({ where: { libraryId: id } })
    return prisma.library.delete({ where: { id } })
  }

  if (action === 'delete') {
    // Hard delete — cascade: memberships, book copies, loans, reservations, shelves, then library
    const shelves = await prisma.shelf.findMany({ where: { libraryId: id }, select: { id: true } })
    const shelfIds = shelves.map((s) => s.id)
    const copies = await prisma.bookCopy.findMany({ where: { shelfId: { in: shelfIds } }, select: { id: true } })
    const copyIds = copies.map((c) => c.id)

    await prisma.$transaction([
      prisma.reservation.deleteMany({ where: { bookCopyId: { in: copyIds } } }),
      prisma.loan.deleteMany({ where: { bookCopyId: { in: copyIds } } }),
      prisma.bookCopy.deleteMany({ where: { shelfId: { in: shelfIds } } }),
      prisma.shelf.deleteMany({ where: { libraryId: id } }),
      prisma.libraryMembership.deleteMany({ where: { libraryId: id } }),
      prisma.library.delete({ where: { id } }),
    ])
    return library
  }

  // Default: soft deactivate
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
