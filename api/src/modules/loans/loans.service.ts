import { prisma } from '../../lib/prisma'
import { NotFoundError, BadRequestError, ForbiddenError } from '../../errors'
import { env } from '../../config/env'
import { getSetting } from '../../lib/settings'
import { CreateLoanInput, LoanQueryInput } from './loans.schemas'
import { getConditions } from '../bookCopies/bookCopies.service'

const loanInclude = {
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  issuedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  bookCopy: {
    include: {
      book: { select: { id: true, title: true, author: true, isbn: true } },
      shelf: { include: { library: { select: { id: true, name: true } } } },
    },
  },
  damageReports: {
    include: {
      reportedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
}

function parseLoan(loan: any) {
  return { ...loan, notesEditedBy: loan.notesEditedBy ? JSON.parse(loan.notesEditedBy) : [] }
}

export async function getLoanConfig() {
  const [durationDays, renewalDays, maxRenewals, renewalCutoffDays, conditions] = await Promise.all([
    getSetting('loan.durationDays'),
    getSetting('loan.renewalDays'),
    getSetting('loan.maxRenewals'),
    getSetting('loan.renewalCutoffDays'),
    getConditions(),
  ])
  return {
    durationDays: parseInt(durationDays || '', 10) || env.LOAN_DURATION_DAYS,
    renewalDays: parseInt(renewalDays || '', 10) || 7,
    maxRenewals: parseInt(maxRenewals || '', 10) || env.MAX_RENEW_COUNT,
    renewalCutoffDays: parseInt(renewalCutoffDays || '', 10) || 14,
    conditions,
  }
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

  return { data: data.map(parseLoan), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getLoan(id: string) {
  const loan = await prisma.loan.findUnique({ where: { id }, include: loanInclude })
  if (!loan) throw new NotFoundError('Loan')
  return parseLoan(loan)
}

export async function createLoan(input: CreateLoanInput) {
  const copy = await prisma.bookCopy.findUnique({ where: { id: input.bookCopyId } })
  if (!copy) throw new NotFoundError('Book copy')

  const user = await prisma.user.findUnique({ where: { id: input.userId } })
  if (!user || !user.isActive) throw new NotFoundError('User')

  // Check user has an active membership at the copy's library
  if (!input.bypassMembership) {
    const shelf = await prisma.shelf.findUnique({ where: { id: copy.shelfId }, select: { libraryId: true } })
    if (shelf) {
      const membership = await prisma.libraryMembership.findFirst({
        where: { userId: input.userId, libraryId: shelf.libraryId, isActive: true },
      })
      if (!membership) {
        throw new BadRequestError('User does not have an active membership at this library')
      }
    }
  }

  if (input.dueDate <= new Date()) {
    throw new BadRequestError('Due date must be in the future')
  }

  return prisma.$transaction(async (tx) => {
    // Re-check status inside transaction to prevent race conditions
    const freshCopy = await tx.bookCopy.findUnique({ where: { id: input.bookCopyId } })
    if (!freshCopy || freshCopy.status !== 'AVAILABLE') {
      throw new BadRequestError(`Book copy is not available (current status: ${freshCopy?.status ?? 'unknown'})`)
    }

    const loan = await tx.loan.create({
      data: {
        userId: input.userId,
        bookCopyId: input.bookCopyId,
        dueDate: input.dueDate,
        notes: input.notes,
        issuedById: input.issuedById,
        conditionAtCheckout: freshCopy.condition,
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

    return parseLoan(loan)
  })
}

export async function updateLoan(id: string, data: { notes?: string }, editor?: { id: string; name: string }) {
  const loan = await getLoan(id)

  const updateData: any = { ...data }

  if (data.notes !== undefined && editor) {
    const existing: Array<{ id: string; name: string; at: string }> = Array.isArray(loan.notesEditedBy)
      ? loan.notesEditedBy
      : []
    existing.push({ id: editor.id, name: editor.name, at: new Date().toISOString() })
    updateData.notesEditedBy = JSON.stringify(existing)
  }

  return parseLoan(await prisma.loan.update({ where: { id }, data: updateData, include: loanInclude }))
}

export async function returnLoan(id: string, params?: { condition?: string; copyStatus?: string }) {
  const loan = await getLoan(id)

  if (loan.status === 'RETURNED') {
    throw new BadRequestError('Loan has already been returned')
  }

  const copyCondition = params?.condition
  const copyStatus = params?.copyStatus || undefined

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

    // If staff set a specific copy status, use it; otherwise default logic
    let newCopyStatus: string
    if (copyStatus && copyStatus !== 'AVAILABLE') {
      newCopyStatus = copyStatus
    } else {
      newCopyStatus = pendingReservation ? 'RESERVED' : 'AVAILABLE'
    }

    await tx.bookCopy.update({
      where: { id: loan.bookCopyId },
      data: {
        status: newCopyStatus,
        ...(copyCondition && { condition: copyCondition }),
      },
    })

    if (pendingReservation && newCopyStatus !== 'DAMAGED' && newCopyStatus !== 'RETIRED') {
      const reservationExpiry = parseInt((await getSetting('loan.reservationExpiryDays')) || '', 10) || env.RESERVATION_EXPIRY_DAYS
      await tx.reservation.update({
        where: { id: pendingReservation.id },
        data: {
          bookCopyId: loan.bookCopyId,
          expiresAt: new Date(Date.now() + reservationExpiry * 24 * 60 * 60 * 1000),
        },
      })
    }

    return parseLoan(updatedLoan)
  })
}

export async function renewLoan(id: string, callerId: string, callerRole: string) {
  const loan = await getLoan(id)
  const config = await getLoanConfig()

  if (loan.status !== 'ACTIVE' && loan.status !== 'OVERDUE') {
    throw new BadRequestError('Only active or overdue loans can be renewed')
  }

  if (callerRole === 'MEMBER' && loan.userId !== callerId) {
    throw new ForbiddenError('You can only renew your own loans')
  }

  if (loan.renewCount >= config.maxRenewals) {
    throw new BadRequestError(`Maximum renewal count of ${config.maxRenewals} reached`)
  }

  const now = new Date()
  const daysPastDue = Math.floor((now.getTime() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24))
  if (daysPastDue > config.renewalCutoffDays) {
    throw new BadRequestError('This loan is too overdue to renew — please return the item instead')
  }

  const newDueDate = new Date(loan.dueDate)
  newDueDate.setDate(newDueDate.getDate() + config.renewalDays)

  return parseLoan(await prisma.loan.update({
    where: { id },
    data: {
      dueDate: newDueDate,
      renewCount: { increment: 1 },
      status: 'ACTIVE',
    },
    include: loanInclude,
  }))
}

export async function markOverdue(id: string) {
  const loan = await getLoan(id)
  if (loan.status !== 'ACTIVE') {
    throw new BadRequestError('Only active loans can be marked overdue')
  }
  return parseLoan(await prisma.loan.update({ where: { id }, data: { status: 'OVERDUE' }, include: loanInclude }))
}
