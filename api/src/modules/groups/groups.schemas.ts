import { z } from 'zod'

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Group name must be uppercase letters, digits, or underscores, starting with a letter'),
  description: z.string().max(255).optional(),
})

export const updateGroupSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Group name must be uppercase letters, digits, or underscores, starting with a letter')
    .optional(),
  description: z.string().max(255).optional(),
})

export const reorderGroupsSchema = z.object({
  names: z.array(z.string()).min(1),
})

export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>
export type ReorderGroupsInput = z.infer<typeof reorderGroupsSchema>
