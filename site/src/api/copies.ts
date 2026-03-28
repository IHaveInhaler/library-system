import { api } from './client'
import type { BookCopy, PaginatedResponse } from '../types'

export const copiesApi = {
  list: (params: { page?: number; limit?: number; bookId?: string; shelfId?: string; status?: string } = {}) =>
    api.get<PaginatedResponse<BookCopy>>('/copies', { params }).then((r) => r.data),

  get: (id: string) => api.get<BookCopy>(`/copies/${id}`).then((r) => r.data),

  create: (data: { bookId: string; shelfId: string; condition?: string }) =>
    api.post<BookCopy>('/copies', data).then((r) => r.data),

  update: (id: string, data: { barcode?: string; condition?: string; shelfId?: string }) =>
    api.patch<BookCopy>(`/copies/${id}`, data).then((r) => r.data),

  setStatus: (id: string, status: 'AVAILABLE' | 'DAMAGED' | 'RETIRED') =>
    api.patch<BookCopy>(`/copies/${id}/status`, { status }).then((r) => r.data),

  remove: (id: string) => api.delete(`/copies/${id}`),
}
