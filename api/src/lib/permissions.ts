import { prisma } from './prisma'

export const PERMISSIONS = [
  'VIEW_LIBRARIES',
  'VIEW_ALL_LIBRARIES',
  'MANAGE_BOOKS',
  'MANAGE_LIBRARIES',
  'MANAGE_SHELVES',
  'MANAGE_COPIES',
  'ISSUE_LOANS',
  'RETURN_LOANS',
  'VIEW_ALL_LOANS',
  'MANAGE_RESERVATIONS',
  'VIEW_ALL_RESERVATIONS',
  'MANAGE_MEMBERSHIPS',
  'VIEW_USERS',
  'MANAGE_USERS',
  'RESET_USER_PASSWORD',
  'VIEW_AUDIT_LOG',
] as const

export type Permission = typeof PERMISSIONS[number]

// Defaults used when no DB record exists
export const MEMBER_DEFAULTS: Permission[] = [
  'VIEW_LIBRARIES',
]

export const LIBRARIAN_DEFAULTS: Permission[] = [
  'VIEW_LIBRARIES',
  'MANAGE_BOOKS',
  'MANAGE_LIBRARIES',
  'MANAGE_SHELVES',
  'MANAGE_COPIES',
  'ISSUE_LOANS',
  'RETURN_LOANS',
  'VIEW_ALL_LOANS',
  'MANAGE_RESERVATIONS',
  'VIEW_ALL_RESERVATIONS',
  'MANAGE_MEMBERSHIPS',
  'VIEW_USERS',
  'MANAGE_USERS',
  'RESET_USER_PASSWORD',
]

let cache: Map<string, boolean> | null = null
let cacheExpiry = 0

async function getCache(): Promise<Map<string, boolean>> {
  const now = Date.now()
  if (cache && now < cacheExpiry) return cache

  const records = await prisma.rolePermission.findMany()
  cache = new Map()
  for (const r of records) {
    cache.set(`${r.role}:${r.permission}`, r.granted)
  }
  cacheExpiry = now + 30_000
  return cache
}

export async function hasPermission(role: string, permission: string): Promise<boolean> {
  if (role === 'ADMIN') return true
  const c = await getCache()
  const key = `${role}:${permission}`
  if (c.has(key)) return c.get(key)!
  // Fall back to role defaults
  if (role === 'LIBRARIAN') return (LIBRARIAN_DEFAULTS as string[]).includes(permission)
  if (role === 'MEMBER') return (MEMBER_DEFAULTS as string[]).includes(permission)
  return false
}

export function invalidatePermissionCache(): void {
  cache = null
  cacheExpiry = 0
}
