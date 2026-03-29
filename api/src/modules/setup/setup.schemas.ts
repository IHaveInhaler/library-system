import { z } from 'zod'

export const verifyCodeSchema = z.object({
  code: z.string().length(6),
})

export const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
})

export const factoryResetSchema = z.object({
  step: z.enum(['challenge', 'verify']),
  code: z.string().length(6).optional(),
})

export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>
export type CreateAdminInput = z.infer<typeof createAdminSchema>
export type FactoryResetInput = z.infer<typeof factoryResetSchema>
