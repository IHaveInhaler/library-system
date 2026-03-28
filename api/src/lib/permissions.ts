import { prisma } from './prisma'

export const PERMISSIONS = [
  // Libraries
  'VIEW_LIBRARIES',
  'VIEW_ALL_LIBRARIES',
  'CREATE_LIBRARY',
  'MANAGE_LIBRARIES',
  'DELETE_LIBRARY',
  'MANAGE_LIBRARY_IMAGE',
  'CREATE_SHELF',
  'MANAGE_SHELVES',
  'DELETE_SHELF',
  'MANAGE_MEMBERSHIPS',

  // Books & Copies
  'MANAGE_BOOKS',
  'DELETE_BOOK',
  'MANAGE_CATEGORIES',
  'MANAGE_COPIES',

  // Loans
  'ISSUE_LOANS',
  'RETURN_LOANS',
  'VIEW_ALL_LOANS',

  // Reservations
  'MANAGE_RESERVATIONS',
  'VIEW_ALL_RESERVATIONS',

  // Users
  'VIEW_USERS',
  'CREATE_USER',
  'MANAGE_USERS',
  'DELETE_USER',
  'RESET_USER_PASSWORD',

  // Barcodes & Images
  'CONFIGURE_BARCODES',
  'CREATE_BARCODES',
  'CONFIGURE_IMAGES',

  // System
  'VIEW_AUDIT_LOG',
  'CONFIGURE_GENERAL',
  'CONFIGURE_SMTP',
  'CONFIGURE_WHITELABEL',
  'CONFIGURE_REGISTRATION',
  'CONFIGURE_2FA',
] as const

export type Permission = typeof PERMISSIONS[number]

// Defaults used when no DB record exists
export const MEMBER_DEFAULTS: Permission[] = [
  'VIEW_LIBRARIES',
]

export const LIBRARIAN_DEFAULTS: Permission[] = [
  'VIEW_LIBRARIES',
  'MANAGE_BOOKS',
  'MANAGE_COPIES',
  'CREATE_SHELF',
  'MANAGE_SHELVES',
  'MANAGE_MEMBERSHIPS',
  'ISSUE_LOANS',
  'RETURN_LOANS',
  'VIEW_ALL_LOANS',
  'MANAGE_RESERVATIONS',
  'VIEW_ALL_RESERVATIONS',
  'VIEW_USERS',
  'CREATE_USER',
  'MANAGE_USERS',
  'RESET_USER_PASSWORD',
  'CREATE_BARCODES',
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
