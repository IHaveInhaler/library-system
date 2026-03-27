import { prisma } from '../../lib/prisma'
import { NotFoundError, BadRequestError, ForbiddenError } from '../../errors'
import { env } from '../../config/env'
import { CreateLoanInput, LoanQueryInput } from './loans.schemas'

const loanInclude = {
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  bookCopy: {
    include: {
      book: { select: { id: true, title: true, author: true, isbn: true } },
      shelf: { include: { library: { select: { id: true, name: true } } } },
    },
  },
}

export async function listLoans(query: LoanQueryInput) {
  const { page, limit, status, userId, bookCopyId } = query
  const skip = (page - 1) * limit

  const where = {
    ...(status && { status }),
    ...(userId && { userId }),
    ...(bookCopyId && { bookCopyId }),
  }

  const [data, total] = await prisma.$transaction([
    prisma.loan.findMany({ where, skip, take: limit, include: loanInclude, orderBy: { borrowedAt: 'desc' } }),
    prisma.loan.count({ where }),
  ])

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getLoan(id: string) {
  const loan = await prisma.loan.findUnique({ where: { id }, include: loanInclude })
  if (!loan) throw new NotFoundError('Loan')
  return loan
}

export async function createLoan(input: CreateLoanInput) {
  const copy = await prisma.bookCopy.findUnique({ where: { id: input.bookCopyId } })
  if (!copy) throw new NotFoundError('Book copy')
  if (copy.status !== 'AVAILABLE') {
    throw new BadRequestError(`Book copy is not available (current status: ${copy.status})`)
  }

  const user = await prisma.user.findUnique({ where: { id: input.userId } })
  if (!user || !user.isActive) throw new NotFoundError('User')

  if (input.dueDate <= new Date()) {
    throw new BadRequestError('Due date must be in the future')
  }

  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.create({
      data: {
        userId: input.userId,
        bookCopyId: input.bookCopyId,
        dueDate: input.dueDate,
        notes: input.notes,
      },
      include: loanInclude,
    })

    await tx.bookCopy.update({
      where: { id: input.bookCopyId },
      data: { status: 'ON_LOAN' },
    })

    // Fulfil any pending reservation this user had for this book
    await tx.reservation.updateMany({
      where: {
        userId: input.userId,
        bookId: copy.bookId,
        status: 'PENDING',
      },
      data: {
        status: 'FULFILLED',
        bookCopyId: input.bookCopyId,
        fulfilledAt: new Date(),
      },
    })

    return loan
  })
}

export async function returnLoan(id: string) {
  const loan = await getLoan(id)

  if (loan.status === 'RETURNED') {
    throw new BadRequestError('Loan has already been returned')
  }

  return prisma.$transaction(async (tx) => {
    const updatedLoan = await tx.loan.update({
      where: { id },
      data: { status: 'RETURNED', returnedAt: new Date() },
      include: loanInclude,
    })

    // Check if any other user has a pending reservation for this book
    const pendingReservation = await tx.reservation.findFirst({
      where: { bookId: loan.bookCopy.book.id, status: 'PENDING' },
      orderBy: { reservedAt: 'asc' },
    })

    const newStatus = pendingReservation ? 'RESERVED' : 'AVAILABLE'

    await tx.bookCopy.update({
      where: { id: loan.bookCopyId },
      data: { status: newStatus },
    })

    if (pendingReservation) {
      await tx.reservation.update({
        where: { id: pendingReservation.id },
        data: {
          bookCopyId: loan.bookCopyId,
          expiresAt: new Date(Date.now() + env.RESERVATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        },
      })
    }

    return updatedLoan
  })
}

export async function renewLoan(id: string, callerId: string, callerRole: string) {
  const loan = await getLoan(id)

  if (loan.status !== 'ACTIVE' && loan.status !== 'OVERDUE') {
    throw new BadRequestError('Only active or overdue loans can be renewed')
  }

  if (callerRole === 'MEMBER' && loan.userId !== callerId) {
    throw new ForbiddenError('You can only renew your own loans')
  }

  if (loan.renewCount >= env.MAX_RENEW_COUNT) {
    throw new BadRequestError(`Maximum renewal count of ${env.MAX_RENEW_COUNT} reached`)
  }

  const newDueDate = new Date(loan.dueDate)
  newDueDate.setDate(newDueDate.getDate() + env.LOAN_DURATION_DAYS)

  return prisma.loan.update({
    where: { id },
    data: {
      dueDate: newDueDate,
      renewCount: { increment: 1 },
      status: 'ACTIVE',
    },
    include: loanInclude,
  })
}

export async function markOverdue(id: string) {
  const loan = await getLoan(id)
  if (loan.status !== 'ACTIVE') {
    throw new BadRequestError('Only active loans can be marked overdue')
  }
  return prisma.loan.update({ where: { id }, data: { status: 'OVERDUE' }, include: loanInclude })
}
