import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { ForbiddenError, NotFoundError } from '../../errors'
import { logAction } from '../../lib/audit'
import * as service from './damageReports.service'

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.listDamageReports(req.query as any)
    res.json(result)
  } catch (err) { next(err) }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await service.getDamageReport(req.params.id as string)
    res.json(report)
  } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, loanId } = req.body

    if (type === 'MEMBER_REPORT') {
      const loan = await prisma.loan.findUnique({ where: { id: loanId } })
      if (!loan) throw new NotFoundError('Loan')
      if (loan.userId !== req.user!.id) throw new ForbiddenError('You can only report damage on your own loans')
    }

    const report = await service.createDamageReport(req.body, req.user!.id)
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'DAMAGE_REPORTED',
      targetType: 'DamageReport',
      targetId: report.id,
      metadata: { type, loanId: report.loanId, bookCopyId: report.bookCopyId },
    })
    res.status(201).json(report)
  } catch (err) { next(err) }
}

export async function getForLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reports = await service.getDamageReportsForLoan(req.params.loanId as string)
    res.json(reports)
  } catch (err) { next(err) }
}

export async function getUserDamageInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [count, reports] = await Promise.all([
      service.getUserDamageReportCount(req.params.userId as string),
      service.getUserDamageReports(req.params.userId as string),
    ])
    res.json({ count, reports })
  } catch (err) { next(err) }
}

export async function resolve(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { resolution, note } = req.body
    const report = await service.resolveDamageReport(
      req.params.id as string,
      req.user!.id,
      resolution,
      note,
    )
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'DAMAGE_RESOLVED',
      targetType: 'DamageReport',
      targetId: report.id,
      metadata: { loanId: report.loanId, resolution, note },
    })
    res.json(report)
  } catch (err) { next(err) }
}
