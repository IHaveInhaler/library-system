import { z } from 'zod'
import { ReservationStatus } from '../../types'

export const createReservationSchema = z.object({
  bookId: z.string().uuid(),
  notes: z.string().max(500).optional(),
})

export const fulfillReservationSchema = z.object({
  bookCopyId: z.string().uuid(),
})

export const reservationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.nativeEnum(ReservationStatus).optional(),
  userId: z.string().uuid().optional(),
  bookId: z.string().uuid().optional(),
})

export type CreateReservationInput = z.infer<typeof createReservationSchema>
export type FulfillReservationInput = z.infer<typeof fulfillReservationSchema>
export type ReservationQueryInput = z.infer<typeof reservationQuerySchema>
