import { prisma } from '../../lib/prisma'
import { NotFoundError, BadRequestError } from '../../errors'
import {
  CreateBookCopyInput,
  UpdateBookCopyInput,
  SetCopyStatusInput,
  CopyQueryInput,
} from './bookCopies.schemas'

const copyInclude = {
  book: { select: { id: true, title: true, author: true, isbn: true, genre: true } },
  shelf: {
    include: { library: { select: { id: true, name: true } } },
  },
}

export async function listCopies(query: CopyQueryInput) {
  const { page, limit, bookId, shelfId, status } = query
  const skip = (page - 1) * limit

  const where = {
    ...(bookId && { bookId }),
    ...(shelfId && { shelfId }),
    ...(status && { status }),
  }

  const [data, total] = await prisma.$transaction([
    prisma.bookCopy.findMany({ where, skip, take: limit, include: copyInclude, orderBy: { barcode: 'asc' } }),
    prisma.bookCopy.count({ where }),
  ])

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getCopy(id: string) {
  const copy = await prisma.bookCopy.findUnique({
    where: { id },
    include: {
      ...copyInclude,
      loans: {
        where: { status: 'ACTIVE' },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        take: 1,
      },
    },
  })
  if (!copy) throw new NotFoundError('Book copy')
  return copy
}

export async function createCopy(input: CreateBookCopyInput) {
  return prisma.bookCopy.create({ data: input, include: copyInclude })
}

export async function updateCopy(id: string, input: UpdateBookCopyInput) {
  await getCopy(id)
  return prisma.bookCopy.update({ where: { id }, data: input, include: copyInclude })
}

export async function setCopyStatus(id: string, input: SetCopyStatusInput) {
  const copy = await getCopy(id)

  if (input.status !== 'AVAILABLE' && copy.status === 'ON_LOAN') {
    throw new BadRequestError('Cannot change status of a copy that is currently on loan')
  }

  return prisma.bookCopy.update({ where: { id }, data: { status: input.status }, include: copyInclude })
}

export async function deleteCopy(id: string) {
  const copy = await getCopy(id)

  if (copy.status === 'ON_LOAN') {
    throw new BadRequestError('Cannot delete a copy that is currently on loan')
  }

  return prisma.bookCopy.delete({ where: { id } })
}
