import { z } from 'zod'

export const createMembershipSchema = z.object({
  userId: z.string().uuid(),
  membershipType: z.string().min(1).default('PERMANENT'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
})

export const updateMembershipSchema = z.object({
  membershipType: z.string().min(1).optional(),
  endDate: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export type CreateMembershipInput = z.infer<typeof createMembershipSchema>
export type UpdateMembershipInput = z.infer<typeof updateMembershipSchema>
