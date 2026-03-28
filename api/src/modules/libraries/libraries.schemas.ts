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
  printMethod: z.enum(['browser', 'zpl', 'ipp']).nullable().optional(),
  printZplHost: z.string().max(255).nullable().optional(),
  printZplPort: z.string().max(10).nullable().optional(),
  printZplLabelWidth: z.string().max(10).nullable().optional(),
  printZplLabelHeight: z.string().max(10).nullable().optional(),
  printIppUrl: z.string().max(500).nullable().optional(),
})

export const libraryQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
})

export type CreateLibraryInput = z.infer<typeof createLibrarySchema>
export type UpdateLibraryInput = z.infer<typeof updateLibrarySchema>
export type LibraryQueryInput = z.infer<typeof libraryQuerySchema>
