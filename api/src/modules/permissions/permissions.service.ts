import { prisma } from '../../lib/prisma'
import { PERMISSIONS, LIBRARIAN_DEFAULTS, invalidatePermissionCache, Permission } from '../../lib/permissions'

const CONFIGURABLE_ROLES = ['MEMBER', 'LIBRARIAN'] as const

export async function getPermissionMatrix() {
  const records = await prisma.rolePermission.findMany()

  const matrix: Record<string, Record<string, boolean>> = {}

  for (const role of CONFIGURABLE_ROLES) {
    matrix[role] = {}
    for (const perm of PERMISSIONS) {
      const record = records.find((r) => r.role === role && r.permission === perm)
      if (record) {
        matrix[role][perm] = record.granted
      } else {
        // Use defaults when no DB record
        matrix[role][perm] = role === 'LIBRARIAN' && (LIBRARIAN_DEFAULTS as string[]).includes(perm)
      }
    }
  }

  return matrix
}

export async function setPermission(role: string, permission: string, granted: boolean) {
  if (role === 'ADMIN') {
    throw new Error('Cannot modify ADMIN permissions')
  }
  if (!(PERMISSIONS as readonly string[]).includes(permission)) {
    throw new Error(`Unknown permission: ${permission}`)
  }

  const result = await prisma.rolePermission.upsert({
    where: { role_permission: { role, permission } },
    update: { granted },
    create: { role, permission, granted },
  })

  invalidatePermissionCache()
  return result
}
