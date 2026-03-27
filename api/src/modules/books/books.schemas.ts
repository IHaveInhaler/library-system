import { z } from 'zod'
import { Genre } from '../../types'

export const createBookSchema = z.object({
  isbn: z.string().min(10).max(20),
  title: z.string().min(1).max(500),
  author: z.string().min(1).max(300),
  publisher: z.string().max(200).optional(),
  publishedYear: z.number().int().min(1000).max(new Date().getFullYear()).optional(),
  genre: z.nativeEnum(Genre),
  description: z.string().max(5000).optional(),
  coverUrl: z.string().url().optional(),
  totalPages: z.number().int().min(1).optional(),
  language: z.string().length(2).default('en'),
})

export const updateBookSchema = createBookSchema.partial()

export const bookQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  genre: z.nativeEnum(Genre).optional(),
  search: z.string().optional(),
  author: z.string().optional(),
  language: z.string().optional(),
  shelfId: z.string().optional(),
  libraryId: z.string().optional(),
})

export const isbnLookupSchema = z.object({
  isbn: z.string().min(10).max(20),
  genre: z.nativeEnum(Genre).optional(),
  shelfId: z.string().uuid().optional(),
})

export type CreateBookInput = z.infer<typeof createBookSchema>
export type UpdateBookInput = z.infer<typeof updateBookSchema>
export type BookQueryInput = z.infer<typeof bookQuerySchema>
export type IsbnLookupInput = z.infer<typeof isbnLookupSchema>
