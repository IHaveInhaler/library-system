import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  registrationToken: z.string().optional(),
})

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d{6}$/, 'Code must be 6 digits'),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const resetPasswordTokenSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid token format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordTokenInput = z.infer<typeof resetPasswordTokenSchema>
