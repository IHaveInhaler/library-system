import { prisma } from '../../lib/prisma'
import { AuditQueryInput } from './audit.schemas'

export async function listAuditLogs(query: AuditQueryInput) {
  const { page, limit, actorId, action, targetType, targetId } = query
  const skip = (page - 1) * limit

  const where = {
    ...(actorId && { actorId }),
    ...(action && { action: { contains: action } }),
    ...(targetType && { targetType }),
    ...(targetId && { targetId }),
  }

  const [data, total] = await prisma.$transaction([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.auditLog.count({ where }),
  ])

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getUserAuditLogs(userId: string, query: AuditQueryInput) {
  const { page, limit } = query
  const skip = (page - 1) * limit

  // Activity tab: only show actions performed ON this user (not BY them)
  const where = {
    targetType: 'User',
    targetId: userId,
  }

  const [data, total] = await prisma.$transaction([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.auditLog.count({ where }),
  ])

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}
