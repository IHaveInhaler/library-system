import { api } from './client'
import type { AuthResponse } from '../types'

export interface TwoFactorStatus {
  totpEnabled: boolean
  securityKeyCount: number
  required: boolean
  securityKeysOnly: boolean
  enforced: boolean
}

export interface TotpSetupResponse {
  secret: string
  otpauthUrl: string
  qrCode: string
}

export interface SecurityKeyInfo {
  id: string
  name: string
  createdAt: string
}

export const twoFactorApi = {
  status: () => api.get<TwoFactorStatus>('/auth/2fa/status').then((r) => r.data),

  // TOTP
  totpSetup: () => api.post<TotpSetupResponse>('/auth/2fa/totp/setup').then((r) => r.data),
  totpVerify: (code: string) => api.post('/auth/2fa/totp/verify', { code }).then((r) => r.data),
  totpRemove: () => api.delete('/auth/2fa/totp').then((r) => r.data),

  // Security keys
  securityKeys: () => api.get<SecurityKeyInfo[]>('/auth/2fa/security-keys').then((r) => r.data),
  removeSecurityKey: (id: string) => api.delete(`/auth/2fa/security-key/${id}`).then((r) => r.data),

  // Security key registration
  securityKeyRegisterOptions: () =>
    api.post('/auth/2fa/security-key/register-options').then((r) => r.data),
  securityKeyRegisterVerify: (attestation: any, name: string) =>
    api.post('/auth/2fa/security-key/register-verify', { attestation, name }).then((r) => r.data),

  // Security key authentication (during login)
  securityKeyAuthOptions: (challengeToken: string) =>
    api.post('/auth/2fa/security-key/auth-options', { challengeToken }).then((r) => r.data),

  // Challenge (during login)
  challenge: (data: { challengeToken: string; method: string; code?: string; assertion?: any }) =>
    api.post<AuthResponse>('/auth/2fa/challenge', data).then((r) => r.data),
}
