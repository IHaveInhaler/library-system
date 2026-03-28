import { prisma } from './prisma'

// Maps setting key → environment variable name.
// When the env var is set (non-empty), it overrides the DB value and the key is locked.
export const SETTING_ENV_MAP: Record<string, string> = {
  'smtp.enabled': 'SMTP_ENABLED',
  'smtp.host':    'SMTP_HOST',
  'smtp.port':    'SMTP_PORT',
  'smtp.user':    'SMTP_USER',
  'smtp.pass':    'SMTP_PASS',
  'smtp.from':    'SMTP_FROM',
  'app.baseUrl':  'APP_BASE_URL',
}

/** Returns the effective value for a key (env beats DB), or null if unset. */
export async function getSetting(key: string): Promise<string | null> {
  const envVar = SETTING_ENV_MAP[key]
  if (envVar && process.env[envVar] !== undefined && process.env[envVar] !== '') {
    return process.env[envVar]!
  }
  const row = await prisma.systemSetting.findUnique({ where: { key } })
  return row?.value ?? null
}

/** Returns effective values for multiple keys. */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const dbRows = await prisma.systemSetting.findMany({ where: { key: { in: keys } } })
  const result: Record<string, string> = {}
  for (const row of dbRows) result[row.key] = row.value
  // Env overrides take precedence
  for (const key of keys) {
    const envVar = SETTING_ENV_MAP[key]
    if (envVar && process.env[envVar] !== undefined && process.env[envVar] !== '') {
      result[key] = process.env[envVar]!
    }
  }
  return result
}

/** Returns the set of keys that are currently locked by an env var. */
export function getLockedKeys(): string[] {
  return Object.entries(SETTING_ENV_MAP)
    .filter(([, envVar]) => process.env[envVar] !== undefined && process.env[envVar] !== '')
    .map(([key]) => key)
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } })
}

export async function setSettings(settings: Record<string, string>): Promise<void> {
  await Promise.all(Object.entries(settings).map(([key, value]) => setSetting(key, value)))
}
