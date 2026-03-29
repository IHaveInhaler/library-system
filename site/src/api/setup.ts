import { api } from './client'
import type { AuthResponse } from '../types'

export interface SetupStatus {
  needsSetup: boolean
  devMode: boolean
  devSeeded: boolean
  environment: 'development' | 'production' | 'test'
  hasExistingData: boolean
  backupCount: number
}

export interface SetupBackup {
  id: string
  label: string
  size: number
  reason: string
  createdAt: string
}

export const setupApi = {
  status: () => api.get<SetupStatus>('/setup/status').then((r) => r.data),

  generateCode: () =>
    api.post<{ message: string }>('/setup/generate-code').then((r) => r.data),

  verifyCode: (code: string) =>
    api.post<{ setupToken: string }>('/setup/verify-code', { code }).then((r) => r.data),

  createAdmin: (
    setupToken: string,
    data: { email: string; password: string; firstName: string; lastName: string }
  ) =>
    api
      .post<AuthResponse>('/setup/admin', data, {
        headers: { 'X-Setup-Token': setupToken },
      })
      .then((r) => r.data),

  resume: () => api.post('/setup/resume').then((r) => r.data),

  complete: () => api.post('/setup/complete').then((r) => r.data),

  devSeed: (setupToken: string) =>
    api
      .post<AuthResponse>('/setup/dev-seed', {}, { headers: { 'X-Setup-Token': setupToken } })
      .then((r) => r.data),

  setDevMode: (enabled: boolean) =>
    api.post<{ devMode: boolean }>('/setup/dev-mode', { enabled }).then((r) => r.data),

  listBackups: (setupToken: string) =>
    api
      .get<{ backups: SetupBackup[] }>('/setup/backups', {
        headers: { 'X-Setup-Token': setupToken },
      })
      .then((r) => r.data.backups),

  restoreBackup: (setupToken: string, backupId: string) =>
    api
      .post('/setup/restore-backup', { backupId }, {
        headers: { 'X-Setup-Token': setupToken },
      })
      .then((r) => r.data),

  factoryResetChallenge: () => api.post('/setup/factory-reset', { step: 'challenge' }).then((r) => r.data),
  factoryResetVerify: (code: string) => api.post('/setup/factory-reset', { step: 'verify', code }).then((r) => r.data),
}
