import { z } from 'zod'
import { Genre } from '../../types'

export const createShelfSchema = z.object({
  code: z.string().min(1).max(20),
  location: z.string().max(300).optional(),
  position: z.string().min(1).max(3).default('L'),
  genre: z.nativeEnum(Genre),
  capacity: z.number().int().min(1).max(10000).default(100),
  libraryId: z.string().uuid(),
})

export const updateShelfSchema = createShelfSchema.omit({ libraryId: true }).partial()

export const shelfQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  libraryId: z.string().uuid().optional(),
  genre: z.nativeEnum(Genre).optional(),
  position: z.string().optional(),
})

export type CreateShelfInput = z.infer<typeof createShelfSchema>
export type UpdateShelfInput = z.infer<typeof updateShelfSchema>
export type ShelfQueryInput = z.infer<typeof shelfQuerySchema>
