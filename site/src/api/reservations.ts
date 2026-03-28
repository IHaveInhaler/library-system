import { api } from './client'
import type { Reservation, PaginatedResponse } from '../types'

export const reservationsApi = {
  list: (params: { page?: number; limit?: number; status?: string; userId?: string; bookId?: string } = {}) =>
    api.get<PaginatedResponse<Reservation>>('/reservations', { params }).then((r) => r.data),

  get: (id: string) => api.get<Reservation>(`/reservations/${id}`).then((r) => r.data),

  create: (data: { bookId: string; userId?: string; notes?: string }) =>
    api.post<Reservation>('/reservations', data).then((r) => r.data),

  cancel: (id: string) =>
    api.patch<Reservation>(`/reservations/${id}/cancel`).then((r) => r.data),

  fulfill: (id: string, bookCopyId: string) =>
    api.patch<Reservation>(`/reservations/${id}/fulfill`, { bookCopyId }).then((r) => r.data),
}
