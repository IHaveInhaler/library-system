import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { getLockedKeys } from '../../lib/settings'
import { logAction } from '../../lib/audit'

const ALLOWED_KEYS = [
  'smtp.enabled',
  'smtp.host',
  'smtp.port',
  'smtp.user',
  'smtp.pass',
  'smtp.from',
  'app.baseUrl',
  'app.behindProxy',
  'reg.mode',
  'reg.allowedDomain',
  'reg.token',
  'reg.requireApproval',
  'reg.requireEmailConfirmation',
  'membership.calendarMonths',
  'brand.appName',
  'brand.logoUrl',
  'brand.primaryColor',
  'brand.faviconUrl',
  '2fa.requiredRoles',
  '2fa.methods',
  '2fa.securityKeysOnly',
  'barcode.shelfFormat',
  'barcode.copyFormat',
  'images.maxSizeMB',
  'images.allowedTypes',
  'images.avatarMaxSizeMB',
  'images.libraryMaxSizeMB',
  'shelf.positions',
  'print.method',
  'print.zpl.host',
  'print.zpl.port',
  'print.zpl.labelWidth',
  'print.zpl.labelHeight',
  'print.ipp.printerUrl',
]

async function buildSettingsResponse() {
  const rows = await prisma.systemSetting.findMany({ where: { key: { in: ALLOWED_KEYS } } })
  const settings: Record<string, string> = {}
  for (const row of rows) settings[row.key] = row.value
  for (const k of ALLOWED_KEYS) if (!(k in settings)) settings[k] = ''

  // Apply env overrides and collect locked keys
  const locked = getLockedKeys().filter((k) => ALLOWED_KEYS.includes(k))
  for (const key of locked) {
    const { SETTING_ENV_MAP } = await import('../../lib/settings')
    const envVar = SETTING_ENV_MAP[key]
    if (envVar && process.env[envVar]) settings[key] = process.env[envVar]!
  }

  // Mask sensitive values — never expose passwords to the frontend
  const MASKED_KEYS = ['smtp.pass']
  for (const key of MASKED_KEYS) {
    if (settings[key] && settings[key].length > 0) {
      settings[key] = '••••••••'
    }
  }

  return { settings, locked }
}

// Public endpoint — returns only registration-related settings (no auth required)
export async function getPublicSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const PUBLIC_KEYS = ['reg.mode', 'reg.allowedDomain', 'brand.appName', 'brand.logoUrl', 'brand.primaryColor', 'brand.faviconUrl']
    const rows = await prisma.systemSetting.findMany({ where: { key: { in: PUBLIC_KEYS } } })
    const settings: Record<string, string> = {}
    for (const row of rows) settings[row.key] = row.value
    for (const k of PUBLIC_KEYS) if (!(k in settings)) settings[k] = ''
    res.json({ settings })
  } catch (err) { next(err) }
}

const SENSITIVE_PREFIXES = ['smtp.', 'reg.token']

export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await buildSettingsResponse()

    // Non-admin users should not see sensitive settings
    if (req.user?.role !== 'ADMIN') {
      for (const key of Object.keys(data.settings)) {
        if (SENSITIVE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
          delete data.settings[key]
        }
      }
    }

    res.json(data)
  } catch (err) { next(err) }
}

// Map setting key prefixes to required permissions
const KEY_PERMISSIONS: Record<string, string> = {
  'smtp.': 'CONFIGURE_SMTP',
  'app.': 'CONFIGURE_GENERAL',
  'brand.': 'CONFIGURE_WHITELABEL',
  'reg.': 'CONFIGURE_REGISTRATION',
  'membership.': 'CONFIGURE_GENERAL',
  '2fa.': 'CONFIGURE_2FA',
  'shelf.': 'CONFIGURE_BARCODES',
  'barcode.': 'CONFIGURE_BARCODES',
  'print.': 'CONFIGURE_BARCODES',
  'images.': 'CONFIGURE_IMAGES',
  'dev.': 'ADMIN', // Dev mode is admin-only, not permission-based
}

function getRequiredPermission(key: string): string {
  for (const [prefix, perm] of Object.entries(KEY_PERMISSIONS)) {
    if (key.startsWith(prefix)) return perm
  }
  return 'ADMIN' // Unknown keys require admin
}

export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { hasPermission } = await import('../../lib/permissions')
    const locked = getLockedKeys()
    const updates = req.body as Record<string, string>

    // Check per-key permissions
    for (const key of Object.keys(updates)) {
      if (!ALLOWED_KEYS.includes(key)) continue
      const perm = getRequiredPermission(key)
      if (perm === 'ADMIN') {
        if (req.user?.role !== 'ADMIN') {
          res.status(403).json({ code: 'FORBIDDEN', message: `Admin required to modify ${key}` })
          return
        }
      } else {
        const granted = await hasPermission(req.user!.role, perm)
        if (!granted) {
          res.status(403).json({ code: 'FORBIDDEN', message: `Missing permission: ${perm}` })
          return
        }
      }
    }

    const filtered = Object.entries(updates).filter(
      ([k]) => ALLOWED_KEYS.includes(k) && !locked.includes(k)
    )
    await Promise.all(filtered.map(([key, value]) =>
      prisma.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } })
    ))
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'SETTINGS_UPDATED',
      targetType: 'Settings',
      metadata: { keys: filtered.map(([k]) => k) },
    })
    res.json(await buildSettingsResponse())
  } catch (err) { next(err) }
}
