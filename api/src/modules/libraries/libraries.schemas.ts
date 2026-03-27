import { z } from 'zod'

export const createLibrarySchema = z.object({
  name: z.string().min(1).max(200),
  labelPrefix: z.string().min(1).max(3).regex(/^[A-Za-z]+$/, 'Label prefix must be letters only').transform(s => s.toUpperCase()),
  email: z.string().email().optional(),
  isPrivate: z.boolean().default(false),
})

export const updateLibrarySchema = createLibrarySchema.partial().extend({
  isActive: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
})

export const libraryQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
})

export type CreateLibraryInput = z.infer<typeof createLibrarySchema>
export type UpdateLibraryInput = z.infer<typeof updateLibrarySchema>
export type LibraryQueryInput = z.infer<typeof libraryQuerySchema>
