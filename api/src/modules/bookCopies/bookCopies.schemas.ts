import { z } from 'zod'
import { CopyStatus } from '../../types'

const Condition = z.enum(['GOOD', 'FAIR', 'POOR'])

export const createBookCopySchema = z.object({
  barcode: z.string().max(100).optional(),
  condition: Condition.default('GOOD'),
  bookId: z.string().uuid(),
  shelfId: z.string().uuid(),
  acquiredAt: z.coerce.date().optional(),
})

export const updateBookCopySchema = z.object({
  barcode: z.string().min(1).max(100).optional(),
  condition: Condition.optional(),
  shelfId: z.string().uuid().optional(),
})

export const setCopyStatusSchema = z.object({
  status: z.enum(['DAMAGED', 'RETIRED', 'AVAILABLE']),
})

export const copyQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  bookId: z.string().uuid().optional(),
  shelfId: z.string().uuid().optional(),
  status: z.nativeEnum(CopyStatus).optional(),
})

export type CreateBookCopyInput = z.infer<typeof createBookCopySchema>
export type UpdateBookCopyInput = z.infer<typeof updateBookCopySchema>
export type SetCopyStatusInput = z.infer<typeof setCopyStatusSchema>
export type CopyQueryInput = z.infer<typeof copyQuerySchema>
