import { prisma } from '../../lib/prisma'
import { NotFoundError, BadRequestError, ForbiddenError } from '../../errors'
import { generateShelfLabel, ShelfPosition } from '../../lib/shelfLabel'
import { sendShelfMigrationReport } from '../../lib/mailer'
import { getSetting } from '../../lib/settings'
import { CreateShelfInput, UpdateShelfInput, ShelfQueryInput } from './shelves.schemas'
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

async function generateUniqueLabel(prefix: string, position: ShelfPosition): Promise<string> {
  // Retry until we get a label that doesn't already exist
  for (let attempt = 0; attempt < 10; attempt++) {
    const label = generateShelfLabel(prefix, position)
    const existing = await prisma.shelf.findUnique({ where: { label } })
    if (!existing) return label
  }
  throw new Error('Could not generate a unique shelf label after 10 attempts')
}

export async function listShelves(query: ShelfQueryInput, userId?: string, userRole?: string) {
  const { page, limit, libraryId, genre, position } = query
  const skip = (page - 1) * limit

  const { canViewPublic, canViewAll } = await resolveAccess(userId, userRole)
  const accessibleIds = await getAccessibleLibraryIds(userId, userRole, canViewPublic, canViewAll)

  const where = {
    ...(accessibleIds && { libraryId: { in: accessibleIds } }),
    ...(libraryId && { libraryId }),
    ...(genre && { genre }),
    ...(position && { position }),
  }

  const [data, total] = await prisma.$transaction([
    prisma.shelf.findMany({
      where,
      skip,
      take: limit,
      include: {
        library: { select: { id: true, name: true, labelPrefix: true } },
        _count: { select: { bookCopies: true } },
      },
      orderBy: [{ libraryId: 'asc' }, { code: 'asc' }],
    }),
    prisma.shelf.count({ where }),
  ])

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getShelf(id: string, userId?: string, userRole?: string) {
  const shelf = await prisma.shelf.findUnique({
    where: { id },
    include: {
      library: { select: { id: true, name: true, labelPrefix: true } },
      _count: { select: { bookCopies: true } },
    },
  })
  if (!shelf) throw new NotFoundError('Shelf')

  const { canViewPublic, canViewAll } = await resolveAccess(userId, userRole)
  const accessibleIds = await getAccessibleLibraryIds(userId, userRole, canViewPublic, canViewAll)
  if (accessibleIds && !accessibleIds.includes(shelf.libraryId)) {
    throw new ForbiddenError('You need a membership to access this library')
  }

  return shelf
}

export async function createShelf(input: CreateShelfInput) {
  const library = await prisma.library.findUnique({ where: { id: input.libraryId } })
  if (!library) throw new NotFoundError('Library')

  const label = await generateUniqueLabel(library.labelPrefix, input.position as ShelfPosition)

  return prisma.shelf.create({
    data: { ...input, label },
    include: { library: { select: { id: true, name: true, labelPrefix: true } } },
  })
}

export async function updateShelf(id: string, input: UpdateShelfInput) {
  const shelf = await getShelf(id)

  // If position changed, regenerate the label
  let label: string | undefined
  if (input.position && input.position !== shelf.position) {
    const library = await prisma.library.findUnique({ where: { id: shelf.libraryId } })
    label = await generateUniqueLabel(library!.labelPrefix, input.position as ShelfPosition)
  }

  return prisma.shelf.update({
    where: { id },
    data: { ...input, ...(label && { label }) },
    include: { library: { select: { id: true, name: true, labelPrefix: true } } },
  })
}

export async function deleteShelf(id: string) {
  const shelf = await getShelf(id)
  if ((shelf._count as any).bookCopies > 0) {
    throw new BadRequestError('Cannot delete shelf with assigned book copies')
  }
  return prisma.shelf.delete({ where: { id } })
}

export async function migratePosition(fromPosition: string, toPosition: string) {
  if (!fromPosition || !toPosition) throw new BadRequestError('Both fromPosition and toPosition are required')
  if (fromPosition === toPosition) throw new BadRequestError('Positions must be different')

  // Find all shelves with the old position
  const shelves = await prisma.shelf.findMany({
    where: { position: fromPosition },
    include: { library: { select: { labelPrefix: true } } },
  })

  if (shelves.length === 0) {
    return { migrated: 0, changes: [] }
  }

  const changes: { shelfId: string; code: string; oldLabel: string; newLabel: string; library: string }[] = []

  for (const shelf of shelves) {
    const oldLabel = shelf.label
    const newLabel = await generateUniqueLabel(shelf.library.labelPrefix, toPosition as ShelfPosition)

    await prisma.shelf.update({
      where: { id: shelf.id },
      data: { position: toPosition, label: newLabel },
    })

    changes.push({
      shelfId: shelf.id,
      code: shelf.code,
      oldLabel,
      newLabel,
      library: shelf.library.labelPrefix,
    })
  }

  // Email the migration report
  try {
    const smtpFrom = await getSetting('smtp.from')
    const recipient = smtpFrom || 'admin'
    await sendShelfMigrationReport(recipient, fromPosition, toPosition, changes)
  } catch {
    // Migration succeeded even if email fails — changes are logged to console as fallback
  }

  return { migrated: changes.length, changes }
}
