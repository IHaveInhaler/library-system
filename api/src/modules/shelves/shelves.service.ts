import { prisma } from '../../lib/prisma'
import { NotFoundError, BadRequestError } from '../../errors'
import { generateShelfLabel, ShelfPosition } from '../../lib/shelfLabel'
import { CreateShelfInput, UpdateShelfInput, ShelfQueryInput } from './shelves.schemas'

async function generateUniqueLabel(prefix: string, position: ShelfPosition): Promise<string> {
  // Retry until we get a label that doesn't already exist
  for (let attempt = 0; attempt < 10; attempt++) {
    const label = generateShelfLabel(prefix, position)
    const existing = await prisma.shelf.findUnique({ where: { label } })
    if (!existing) return label
  }
  throw new Error('Could not generate a unique shelf label after 10 attempts')
}

export async function listShelves(query: ShelfQueryInput) {
  const { page, limit, libraryId, genre, position } = query
  const skip = (page - 1) * limit

  const where = {
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

export async function getShelf(id: string) {
  const shelf = await prisma.shelf.findUnique({
    where: { id },
    include: {
      library: { select: { id: true, name: true, labelPrefix: true } },
      _count: { select: { bookCopies: true } },
    },
  })
  if (!shelf) throw new NotFoundError('Shelf')
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
