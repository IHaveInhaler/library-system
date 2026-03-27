import { prisma } from '../../lib/prisma'
import { NotFoundError, BadRequestError, ForbiddenError } from '../../errors'
import { env } from '../../config/env'
import {
  CreateReservationInput,
  FulfillReservationInput,
  ReservationQueryInput,
} from './reservations.schemas'

const reservationInclude = {
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  book: { select: { id: true, title: true, author: true, isbn: true } },
  bookCopy: {
    include: {
      shelf: { include: { library: { select: { id: true, name: true } } } },
    },
  },
}

export async function listReservations(query: ReservationQueryInput) {
  const { page, limit, status, userId, bookId } = query
  const skip = (page - 1) * limit

  const where = {
    ...(status && { status }),
    ...(userId && { userId }),
    ...(bookId && { bookId }),
  }

  const [data, total] = await prisma.$transaction([
    prisma.reservation.findMany({
      where,
      skip,
      take: limit,
      include: reservationInclude,
      orderBy: { reservedAt: 'desc' },
    }),
    prisma.reservation.count({ where }),
  ])

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getReservation(id: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: reservationInclude,
  })
  if (!reservation) throw new NotFoundError('Reservation')
  return reservation
}

export async function createReservation(input: CreateReservationInput, userId: string) {
  const book = await prisma.book.findUnique({ where: { id: input.bookId } })
  if (!book) throw new NotFoundError('Book')

  const availableCopy = await prisma.bookCopy.findFirst({
    where: { bookId: input.bookId, status: 'AVAILABLE' },
  })
  if (availableCopy) {
    throw new BadRequestError('Copies are available — please proceed with a loan instead of a reservation')
  }

  const existing = await prisma.reservation.findFirst({
    where: { userId, bookId: input.bookId, status: 'PENDING' },
  })
  if (existing) {
    throw new BadRequestError('You already have a pending reservation for this book')
  }

  const expiresAt = new Date(Date.now() + env.RESERVATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  return prisma.reservation.create({
    data: { userId, bookId: input.bookId, notes: input.notes, expiresAt },
    include: reservationInclude,
  })
}

export async function cancelReservation(id: string, callerId: string, callerRole: string) {
  const reservation = await getReservation(id)

  if (callerRole === 'MEMBER' && reservation.userId !== callerId) {
    throw new ForbiddenError('You can only cancel your own reservations')
  }

  if (reservation.status !== 'PENDING') {
    throw new BadRequestError(`Cannot cancel a reservation with status: ${reservation.status}`)
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: reservationInclude,
    })

    if (reservation.bookCopyId) {
      await tx.bookCopy.update({
        where: { id: reservation.bookCopyId },
        data: { status: 'AVAILABLE' },
      })
    }

    return updated
  })
}

export async function fulfillReservation(id: string, input: FulfillReservationInput) {
  const reservation = await getReservation(id)

  if (reservation.status !== 'PENDING') {
    throw new BadRequestError(`Cannot fulfil a reservation with status: ${reservation.status}`)
  }

  const copy = await prisma.bookCopy.findUnique({ where: { id: input.bookCopyId } })
  if (!copy) throw new NotFoundError('Book copy')
  if (copy.bookId !== reservation.bookId) {
    throw new BadRequestError('Book copy does not match the reserved book')
  }
  if (copy.status !== 'AVAILABLE' && copy.status !== 'RESERVED') {
    throw new BadRequestError(`Copy is not available (status: ${copy.status})`)
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.reservation.update({
      where: { id },
      data: { status: 'FULFILLED', bookCopyId: input.bookCopyId, fulfilledAt: new Date() },
      include: reservationInclude,
    })

    await tx.bookCopy.update({
      where: { id: input.bookCopyId },
      data: { status: 'RESERVED' },
    })

    return updated
  })
}
