import { prisma } from './prisma'

interface LogActionParams {
  actorId?: string
  actorName?: string
  action: string
  targetType?: string
  targetId?: string
  targetName?: string
  metadata?: Record<string, unknown>
}

export async function logAction(params: LogActionParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        actorName: params.actorName ?? null,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        targetName: params.targetName ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    })
  } catch {
    // Audit logging must never break the main flow
  }
}
