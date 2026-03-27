import { z } from 'zod'
import { Role } from '../../types'

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.nativeEnum(Role).default(Role.MEMBER),
})

export const updateUserSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
})

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  role: z.nativeEnum(Role).optional(),
  isActive: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  search: z.string().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UsersQueryInput = z.infer<typeof paginationSchema>
