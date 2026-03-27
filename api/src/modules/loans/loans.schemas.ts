import { z } from 'zod'
import { LoanStatus } from '../../types'

export const createLoanSchema = z.object({
  userId: z.string().uuid(),
  bookCopyId: z.string().uuid(),
  dueDate: z.coerce.date(),
  notes: z.string().max(500).optional(),
})

export const loanQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.nativeEnum(LoanStatus).optional(),
  userId: z.string().uuid().optional(),
  bookCopyId: z.string().uuid().optional(),
})

export type CreateLoanInput = z.infer<typeof createLoanSchema>
export type LoanQueryInput = z.infer<typeof loanQuerySchema>
