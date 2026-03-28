import { prisma } from '../../lib/prisma'
import { NotFoundError, BadRequestError, ConflictError } from '../../errors/index'
import { fetchByIsbn } from '../../lib/openLibrary'
import { CreateBookInput, UpdateBookInput, BookQueryInput, IsbnLookupInput } from './books.schemas'
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

export async function listBooks(query: BookQueryInput, userId?: string, userRole?: string) {
  const { page, limit, genre, search, author, language, shelfId, libraryId } = query
  const skip = (page - 1) * limit

  const { canViewPublic, canViewAll } = await resolveAccess(userId, userRole)
  const accessibleIds = await getAccessibleLibraryIds(userId, userRole, canViewPublic, canViewAll)

  const where = {
    ...(shelfId
      ? { copies: { some: { shelfId, ...(accessibleIds && { shelf: { libraryId: { in: accessibleIds } } }) } } }
      : libraryId
      ? { copies: { some: { shelf: { libraryId, ...(accessibleIds && { libraryId: { in: accessibleIds } }) } } } }
      : accessibleIds && { copies: { some: { shelf: { libraryId: { in: accessibleIds } } } } }),
    ...(genre && { genre }),
    ...(language && { language }),
    ...(author && { author: { contains: author } }),
    ...(search && {
      OR: [
        { title: { contains: search } },
        { author: { contains: search } },
        { isbn: { contains: search } },
        { description: { contains: search } },
      ],
    }),
  }

  const [data, total] = await prisma.$transaction([
    prisma.book.findMany({
      where,
      skip,
      take: limit,
      include: { _count: { select: { copies: true } } },
      orderBy: { title: 'asc' },
    }),
    prisma.book.count({ where }),
  ])

  // Compute availableCount restricted to accessible libraries
  const dataWithCount = await Promise.all(
    data.map(async (book) => {
      const availableCount = await prisma.bookCopy.count({
        where: {
          bookId: book.id,
          status: 'AVAILABLE',
          ...(accessibleIds && { shelf: { libraryId: { in: accessibleIds } } }),
        },
      })
      return { ...book, availableCount }
    }),
  )

  return { data: dataWithCount, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getBook(id: string, userId?: string, userRole?: string) {
  const book = await prisma.book.findUnique({
    where: { id },
    include: { _count: { select: { copies: true } } },
  })
  if (!book) throw new NotFoundError('Book')

  const { canViewPublic, canViewAll } = await resolveAccess(userId, userRole)
  const accessibleIds = await getAccessibleLibraryIds(userId, userRole, canViewPublic, canViewAll)

  const availableCount = await prisma.bookCopy.count({
    where: {
      bookId: id,
      status: 'AVAILABLE',
      ...(accessibleIds && { shelf: { libraryId: { in: accessibleIds } } }),
    },
  })

  return { ...book, availableCount }
}

export async function createBook(input: CreateBookInput) {
  return prisma.book.create({ data: input })
}

export async function updateBook(id: string, input: UpdateBookInput) {
  await getBook(id)
  return prisma.book.update({ where: { id }, data: input })
}

export async function deleteBook(id: string) {
  await getBook(id)

  const activeCopies = await prisma.bookCopy.count({
    where: { bookId: id, status: { in: ['AVAILABLE', 'ON_LOAN', 'RESERVED'] } },
  })

  if (activeCopies > 0) {
    throw new BadRequestError('Cannot delete a book with active copies')
  }

  return prisma.book.delete({ where: { id } })
}

export async function getBookCopies(bookId: string, userId?: string, userRole?: string) {
  await getBook(bookId, userId, userRole)

  const { canViewPublic, canViewAll } = await resolveAccess(userId, userRole)
  const accessibleIds = await getAccessibleLibraryIds(userId, userRole, canViewPublic, canViewAll)

  return prisma.bookCopy.findMany({
    where: {
      bookId,
      ...(accessibleIds && { shelf: { libraryId: { in: accessibleIds } } }),
    },
    include: {
      shelf: {
        include: { library: { select: { id: true, name: true } } },
      },
    },
    orderBy: { barcode: 'asc' },
  })
}

export async function lookupIsbn(isbn: string) {
  const existing = await prisma.book.findUnique({ where: { isbn: isbn.replace(/[-\s]/g, '') } })
  if (existing) {
    return { source: 'database' as const, book: existing, alreadyExists: true }
  }

  const metadata = await fetchByIsbn(isbn)
  if (!metadata) {
    throw new NotFoundError(`No book found for ISBN ${isbn}`)
  }

  return { source: 'openlibrary' as const, book: metadata, alreadyExists: false }
}

export async function createBookFromIsbn(input: IsbnLookupInput) {
  const cleanIsbn = input.isbn.replace(/[-\s]/g, '')

  const existing = await prisma.book.findUnique({ where: { isbn: cleanIsbn } })
  if (existing) throw new ConflictError(`Book with ISBN ${cleanIsbn} already exists`)

  const metadata = await fetchByIsbn(cleanIsbn)
  if (!metadata) {
    throw new NotFoundError(`No book data found for ISBN ${cleanIsbn}`)
  }

  if (input.genre) metadata.genre = input.genre
  if (input.title) metadata.title = input.title
  if (input.author) metadata.author = input.author
  if (input.publisher !== undefined) metadata.publisher = input.publisher
  if (input.publishedYear !== undefined) metadata.publishedYear = input.publishedYear
  if (input.description !== undefined) metadata.description = input.description
  if (input.language) metadata.language = input.language

  return prisma.book.create({ data: metadata })
}
