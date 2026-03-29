import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { requireStaffAccess } from '../../lib/libraryStaff'
import { NotFoundError } from '../../errors'
import { logAction } from '../../lib/audit'
import * as loansService from './loans.service'
import { createDamageReport } from '../damageReports/damageReports.service'

async function getLibraryIdForCopy(copyId: string): Promise<string> {
  const copy = await prisma.bookCopy.findUnique({
    where: { id: copyId },
    include: { shelf: { select: { libraryId: true } } },
  })
  if (!copy) throw new NotFoundError('Book copy')
  return copy.shelf.libraryId
}

async function getLibraryIdForLoan(loanId: string): Promise<string> {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { bookCopy: { include: { shelf: { select: { libraryId: true } } } } },
  })
  if (!loan) throw new NotFoundError('Loan')
  return loan.bookCopy.shelf.libraryId
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await loansService.listLoans(req.query as any)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const loan = await loansService.getLoan(req.params.id as string)
    res.json(loan)
  } catch (err) {
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const libraryId = await getLibraryIdForCopy(req.body.bookCopyId)
    await requireStaffAccess(req.user!.id, req.user!.role, libraryId)
    const loan = await loansService.createLoan({ ...req.body, issuedById: req.user!.id })
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'LOAN_ISSUED',
      targetType: 'Loan',
      targetId: loan.id,
      targetName: loan.bookCopy.book.title,
      metadata: { userId: loan.userId, bookCopyId: loan.bookCopyId, dueDate: loan.dueDate },
    })
    res.status(201).json(loan)
  } catch (err) {
    next(err)
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const libraryId = await getLibraryIdForLoan(req.params.id as string)
    await requireStaffAccess(req.user!.id, req.user!.role, libraryId)
    const loan = await loansService.updateLoan(req.params.id as string, req.body, {
      id: req.user!.id,
      name: req.user!.email,
    })
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'LOAN_UPDATED',
      targetType: 'Loan',
      targetId: loan.id,
      targetName: loan.bookCopy.book.title,
    })
    res.json(loan)
  } catch (err) { next(err) }
}

export async function returnLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const libraryId = await getLibraryIdForLoan(req.params.id as string)
    await requireStaffAccess(req.user!.id, req.user!.role, libraryId)

    const { condition, copyStatus, reportDamage, damageDescription } = req.body || {}

    // Get the loan before return to capture conditionAtCheckout
    const loanBefore = await loansService.getLoan(req.params.id as string)

    const loan = await loansService.returnLoan(req.params.id as string, { condition, copyStatus })

    // Create damage report if requested
    if (reportDamage) {
      await createDamageReport({
        loanId: loan.id,
        bookCopyId: loan.bookCopyId,
        type: 'STAFF_RETURN',
        conditionBefore: loanBefore.conditionAtCheckout || undefined,
        conditionAfter: condition || undefined,
        description: damageDescription,
      }, req.user!.id)
    }

    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'LOAN_RETURNED',
      targetType: 'Loan',
      targetId: loan.id,
      targetName: loan.bookCopy.book.title,
      metadata: { userId: loan.userId, bookCopyId: loan.bookCopyId, condition, copyStatus, reportDamage },
    })
    res.json(loan)
  } catch (err) {
    next(err)
  }
}

export async function renewLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const loan = await loansService.renewLoan(
      req.params.id as string,
      req.user!.id,
      req.user!.role
    )
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'LOAN_RENEWED',
      targetType: 'Loan',
      targetId: loan.id,
      targetName: loan.bookCopy.book.title,
      metadata: { renewCount: loan.renewCount, newDueDate: loan.dueDate },
    })
    res.json(loan)
  } catch (err) {
    next(err)
  }
}

export async function markOverdue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const loan = await loansService.markOverdue(req.params.id as string)
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'LOAN_OVERDUE',
      targetType: 'Loan',
      targetId: loan.id,
      targetName: loan.bookCopy.book.title,
      metadata: { userId: loan.userId, dueDate: loan.dueDate },
    })
    res.json(loan)
  } catch (err) {
    next(err)
  }
}
