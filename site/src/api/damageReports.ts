import { api } from './client'
import type { DamageReport, PaginatedResponse } from '../types'

export const damageReportsApi = {
  list: (params: { page?: number; limit?: number; loanId?: string; bookCopyId?: string; userId?: string } = {}) =>
    api.get<PaginatedResponse<DamageReport>>('/damage-reports', { params }).then((r) => r.data),

  get: (id: string) => api.get<DamageReport>(`/damage-reports/${id}`).then((r) => r.data),

  create: (data: { loanId: string; bookCopyId: string; type: string; conditionBefore?: string; conditionAfter?: string; description?: string }) =>
    api.post<DamageReport>('/damage-reports', data).then((r) => r.data),

  forLoan: (loanId: string) =>
    api.get<DamageReport[]>(`/damage-reports/loan/${loanId}`).then((r) => r.data),

  forUser: (userId: string) =>
    api.get<{ count: { total: number; unresolved: number; warnings: number; confirmed: number }; reports: DamageReport[] }>(`/damage-reports/user/${userId}`).then((r) => r.data),

  resolve: (id: string, resolution: 'DISMISSED' | 'WARNING' | 'CONFIRMED', note?: string) =>
    api.patch<DamageReport>(`/damage-reports/${id}/resolve`, { resolution, note }).then((r) => r.data),
}
