import { api } from './client'

export type SettingKey =
  | 'smtp.enabled'
  | 'smtp.host'
  | 'smtp.port'
  | 'smtp.user'
  | 'smtp.pass'
  | 'smtp.from'
  | 'app.baseUrl'
  | 'app.behindProxy'
  | 'reg.mode'
  | 'reg.allowedDomain'
  | 'reg.token'
  | 'reg.requireApproval'
  | 'reg.requireEmailConfirmation'
  | 'membership.calendarMonths'
  | 'brand.appName'
  | 'brand.logoUrl'
  | 'brand.primaryColor'
  | 'brand.faviconUrl'
  | '2fa.requiredRoles'
  | '2fa.methods'
  | '2fa.securityKeysOnly'
  | 'barcode.shelfFormat'
  | 'barcode.copyFormat'
  | 'images.maxSizeMB'
  | 'images.allowedTypes'
  | 'images.avatarMaxSizeMB'
  | 'images.libraryMaxSizeMB'
  | 'shelf.positions'

export type SettingsResponse = {
  settings: Record<SettingKey, string>
  locked: SettingKey[]
}

export const settingsApi = {
  get: () => api.get<SettingsResponse>('/settings').then((r) => r.data),
  getPublic: () => api.get<{ settings: Record<string, string> }>('/settings/public').then((r) => r.data),
  update: (data: Partial<Record<SettingKey, string>>) =>
    api.patch<SettingsResponse>('/settings', data).then((r) => r.data),
}
