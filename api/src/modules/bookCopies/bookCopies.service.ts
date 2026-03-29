import crypto from 'crypto'
import { prisma } from '../../lib/prisma'
import { NotFoundError, BadRequestError } from '../../errors'
import { getSetting } from '../../lib/settings'
import {
  CreateBookCopyInput,
  UpdateBookCopyInput,
  SetCopyStatusInput,
  CopyQueryInput,
} from './bookCopies.schemas'

const DEFAULT_CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']

export async function getConditions(): Promise<string[]> {
  const raw = await getSetting('copy.conditions')
  if (!raw) return DEFAULT_CONDITIONS
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CONDITIONS
  } catch {
    return DEFAULT_CONDITIONS
  }
}

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

const DEFAULT_COPY_FORMAT = '{ISBN}-{DIGITS}-{CHECK}'

/** Luhn mod-10 check digit for a numeric string */
function luhnCheck(digits: string): string {
  let sum = 0
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10)
    if ((digits.length - i) % 2 === 1) d *= 2
    if (d > 9) d -= 9
    sum += d
  }
  return String((10 - (sum % 10)) % 10)
}

async function generateCopyBarcode(bookId: string, shelfId: string): Promise<string> {
  const format = (await getSetting('barcode.copyFormat')) || DEFAULT_COPY_FORMAT
  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { isbn: true } })
  const shelf = await prisma.shelf.findUnique({ where: { id: shelfId }, include: { library: { select: { labelPrefix: true } } } })

  const rawIsbn = (book?.isbn ?? 'UNKNOWN').replace(/[-\s]/g, '')
  const prefix = shelf?.library?.labelPrefix?.toUpperCase() ?? 'XXX'
  const existingCount = await prisma.bookCopy.count({ where: { bookId } })

  for (let attempt = 0; attempt < 10; attempt++) {
    const seq = String(existingCount + attempt + 1).padStart(3, '0')
    const random = crypto.randomBytes(3).toString('hex').toUpperCase()
    const digits = String(existingCount + attempt + 1).padStart(4, '0')

    // Build barcode without check digit first
    const partial = format
      .replace('{PREFIX}', prefix)
      .replace('{ISBN}', rawIsbn)
      .replace('{SEQ}', seq)
      .replace('{DIGITS}', digits)
      .replace('{RANDOM}', random)
      .replace('{CHECK}', '')

    // Compute check digit from all numeric characters in the partial
    const numericPart = partial.replace(/[^0-9]/g, '')
    const check = luhnCheck(numericPart)

    const barcode = format
      .replace('{PREFIX}', prefix)
      .replace('{ISBN}', rawIsbn)
      .replace('{SEQ}', seq)
      .replace('{DIGITS}', digits)
      .replace('{RANDOM}', random)
      .replace('{CHECK}', check)

    const existing = await prisma.bookCopy.findUnique({ where: { barcode } })
    if (!existing) return barcode
  }
  // Fallback — timestamp-based
  return `${rawIsbn}-${Date.now().toString(36).toUpperCase()}`
}

export async function createCopy(input: CreateBookCopyInput) {
  const barcode = await generateCopyBarcode(input.bookId, input.shelfId)
  return prisma.bookCopy.create({ data: { bookId: input.bookId, shelfId: input.shelfId, condition: input.condition, acquiredAt: input.acquiredAt, barcode }, include: copyInclude })
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
