import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { getLockedKeys } from '../../lib/settings'

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

export async function getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await buildSettingsResponse())
  } catch (err) { next(err) }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const locked = getLockedKeys()
    const updates = req.body as Record<string, string>
    const filtered = Object.entries(updates).filter(
      ([k]) => ALLOWED_KEYS.includes(k) && !locked.includes(k)
    )
    await Promise.all(filtered.map(([key, value]) =>
      prisma.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } })
    ))
    res.json(await buildSettingsResponse())
  } catch (err) { next(err) }
}
