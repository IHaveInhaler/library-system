import { z } from 'zod'
import { LoanStatus } from '../../types'

export const createLoanSchema = z.object({
  userId: z.string().uuid(),
  bookCopyId: z.string().uuid(),
  dueDate: z.coerce.date(),
  notes: z.string().max(500).optional(),
  bypassMembership: z.boolean().optional(),
  issuedById: z.string().uuid().optional(),
})

export const loanQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.nativeEnum(LoanStatus).optional(),
  userId: z.string().uuid().optional(),
  bookCopyId: z.string().uuid().optional(),
})

export const updateLoanSchema = z.object({
  notes: z.string().max(1000).optional(),
})

export const returnLoanSchema = z.object({
  condition: z.string().min(1).max(50).optional(),
  copyStatus: z.enum(['AVAILABLE', 'DAMAGED', 'RETIRED']).default('AVAILABLE'),
  reportDamage: z.boolean().default(false),
  damageDescription: z.string().max(2000).optional(),
})

export type CreateLoanInput = z.infer<typeof createLoanSchema>
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>
export type LoanQueryInput = z.infer<typeof loanQuerySchema>
export type ReturnLoanInput = z.infer<typeof returnLoanSchema>
