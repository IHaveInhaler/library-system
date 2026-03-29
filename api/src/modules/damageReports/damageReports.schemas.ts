import { z } from 'zod'

export const createDamageReportSchema = z.object({
  loanId: z.string().uuid(),
  bookCopyId: z.string().uuid(),
  type: z.enum(['STAFF_RETURN', 'STAFF_REPORT', 'MEMBER_REPORT']),
  conditionBefore: z.string().max(50).optional(),
  conditionAfter: z.string().max(50).optional(),
  description: z.string().max(2000).optional(),
})

export const damageReportQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  loanId: z.string().uuid().optional(),
  bookCopyId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
})

export const resolveDamageReportSchema = z.object({
  resolution: z.enum(['DISMISSED', 'WARNING', 'CONFIRMED']),
  note: z.string().max(1000).optional(),
})

export type CreateDamageReportInput = z.infer<typeof createDamageReportSchema>
export type DamageReportQueryInput = z.infer<typeof damageReportQuerySchema>
