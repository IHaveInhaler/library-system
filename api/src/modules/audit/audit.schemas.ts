import { z } from 'zod'

export const auditQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  actorId: z.string().optional(),
  action: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
})

export type AuditQueryInput = z.infer<typeof auditQuerySchema>
