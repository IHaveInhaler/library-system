import { prisma } from '../../lib/prisma'
import { NotFoundError } from '../../errors'
import { CreateDamageReportInput, DamageReportQueryInput } from './damageReports.schemas'

const damageReportInclude = {
  loan: { select: { id: true, userId: true } },
  bookCopy: {
    include: {
      book: { select: { id: true, title: true, author: true, isbn: true } },
    },
  },
  reportedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
}

export async function listDamageReports(query: DamageReportQueryInput) {
  const { page, limit, loanId, bookCopyId, userId } = query
  const skip = (page - 1) * limit

  const where = {
    ...(loanId && { loanId }),
    ...(bookCopyId && { bookCopyId }),
    ...(userId && { loan: { userId } }),
  }

  const [data, total] = await prisma.$transaction([
    prisma.damageReport.findMany({ where, skip, take: limit, include: damageReportInclude, orderBy: { createdAt: 'desc' } }),
    prisma.damageReport.count({ where }),
  ])

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getDamageReport(id: string) {
  const report = await prisma.damageReport.findUnique({ where: { id }, include: damageReportInclude })
  if (!report) throw new NotFoundError('Damage report')
  return report
}

export async function createDamageReport(input: CreateDamageReportInput, reportedById: string) {
  return prisma.damageReport.create({
    data: { ...input, reportedById },
    include: damageReportInclude,
  })
}

export async function resolveDamageReport(id: string, resolvedById: string, resolution: string, note?: string) {
  const report = await prisma.damageReport.findUnique({ where: { id } })
  if (!report) throw new NotFoundError('Damage report')
  return prisma.damageReport.update({
    where: { id },
    data: { resolvedAt: new Date(), resolvedById, resolvedNote: note, resolution },
    include: damageReportInclude,
  })
}

export async function getDamageReportsForLoan(loanId: string) {
  return prisma.damageReport.findMany({
    where: { loanId },
    include: damageReportInclude,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getUserDamageReportCount(userId: string) {
  const [unresolved, warnings, confirmed] = await Promise.all([
    prisma.damageReport.count({
      where: { loan: { userId }, type: { in: ['STAFF_RETURN', 'STAFF_REPORT'] }, resolvedAt: null },
    }),
    prisma.damageReport.count({
      where: { loan: { userId }, type: { in: ['STAFF_RETURN', 'STAFF_REPORT'] }, resolution: 'WARNING' },
    }),
    prisma.damageReport.count({
      where: { loan: { userId }, type: { in: ['STAFF_RETURN', 'STAFF_REPORT'] }, resolution: 'CONFIRMED' },
    }),
  ])
  return { total: unresolved + warnings + confirmed, unresolved, warnings, confirmed }
}

export async function getUserDamageReports(userId: string) {
  return prisma.damageReport.findMany({
    where: {
      loan: { userId },
      type: { in: ['STAFF_RETURN', 'STAFF_REPORT'] },
    },
    include: damageReportInclude,
    orderBy: { createdAt: 'desc' },
  })
}
