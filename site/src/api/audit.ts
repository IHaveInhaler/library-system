import { api } from './client'
import type { AuditLog, PaginatedResponse } from '../types'

export interface AuditFilters {
  page?: number
  limit?: number
  actorId?: string
  action?: string
  targetType?: string
  targetId?: string
}

export const auditApi = {
  list: (params: AuditFilters = {}) =>
    api.get<PaginatedResponse<AuditLog>>('/audit', { params }).then((r) => r.data),

  getUserLogs: (userId: string, params: { page?: number; limit?: number } = {}) =>
    api.get<PaginatedResponse<AuditLog>>(`/users/${userId}/audit`, { params }).then((r) => r.data),
}
