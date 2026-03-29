import { Request, Response, NextFunction } from 'express'
import { ForbiddenError } from '../errors'
import { prisma } from '../lib/prisma'
import { getSetting } from '../lib/settings'

/**
 * Blocks authenticated requests when the user still needs to set up 2FA.
 * Must run AFTER authenticate middleware.
 * Allows through: auth endpoints (/api/auth/*) and 2FA endpoints (/api/auth/2fa/*).
 */
export async function require2FACompleted(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next()

    // Always allow auth and 2FA routes
    if (req.originalUrl.startsWith('/api/auth/')) return next()

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { totpVerified: true, pending2FA: true, role: true },
    })
    if (!user) return next()

    const keyCount = await prisma.securityKey.count({ where: { userId: req.user.id } })
    const has2FA = user.totpVerified || keyCount > 0

    // Check if 2FA is bypassed by dev mode
    const devMode = (await getSetting('dev.enabled')) === 'true'
    if (devMode) return next()

    const securityKeysOnly = (await getSetting('2fa.securityKeysOnly')) === 'true'
    const meetsRequirement = securityKeysOnly ? keyCount > 0 : has2FA
    let needs2FA = false

    // Admin-forced pending 2FA
    if (user.pending2FA && !meetsRequirement) {
      needs2FA = true
    }

    // Role-based 2FA requirement
    if (!needs2FA) {
      const requiredRolesJson = await getSetting('2fa.requiredRoles')
      if (requiredRolesJson) {
        try {
          const requiredRoles = JSON.parse(requiredRolesJson)
          if (requiredRoles.includes(user.role) && !meetsRequirement) {
            needs2FA = true
          }
        } catch { /* ignore */ }
      }
    }

    if (needs2FA) {
      throw new ForbiddenError('Your account is locked until you set up two-factor authentication')
    }

    next()
  } catch (err) {
    next(err)
  }
}
