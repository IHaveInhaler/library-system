import { api } from './client'
import type { User, Loan, Reservation, PaginatedResponse } from '../types'

export const usersApi = {
  create: (data: { email: string; firstName: string; lastName: string; role?: string }) =>
    api.post<User>('/users', data).then((r) => r.data),

  list: (params: { page?: number; limit?: number; role?: string; search?: string; isActive?: string } = {}) =>
    api.get<PaginatedResponse<User>>('/users', { params }).then((r) => r.data),

  get: (id: string) => api.get<User>(`/users/${id}`).then((r) => r.data),

  update: (id: string, data: { role?: string; isActive?: boolean; firstName?: string; lastName?: string }) =>
    api.patch<User>(`/users/${id}`, data).then((r) => r.data),

  setActive: (id: string, isActive: boolean, reason?: string) =>
    api.patch<User>(`/users/${id}/active`, { isActive, reason }).then((r) => r.data),

  revokeSessions: (id: string) => api.post(`/users/${id}/revoke-sessions`),

  resetPassword: (id: string) =>
    api.post<{ message: string }>(`/users/${id}/reset-password`).then((r) => r.data),

  remove: (id: string) => api.delete(`/users/${id}`),

  loans: (id: string) => api.get<Loan[]>(`/users/${id}/loans`).then((r) => r.data),

  reservations: (id: string) =>
    api.get<Reservation[]>(`/users/${id}/reservations`).then((r) => r.data),
}
