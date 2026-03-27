import { z } from 'zod'

export const createMembershipTypeSchema = z.object({
  name: z.string().regex(/^[A-Z][A-Z0-9_]*$/, 'Uppercase letters, digits, underscores — must start with a letter'),
  label: z.string().min(1).max(100),
  durationDays: z.number().int().min(1).nullable().optional(),
  isStaff: z.boolean().optional().default(false),
})

export const updateMembershipTypeSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  durationDays: z.number().int().min(1).nullable().optional(),
  isStaff: z.boolean().optional(),
})

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1)),
})

export type CreateMembershipTypeInput = z.infer<typeof createMembershipTypeSchema>
export type UpdateMembershipTypeInput = z.infer<typeof updateMembershipTypeSchema>
