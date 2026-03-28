import { api } from './client'
import type { Shelf, PaginatedResponse } from '../types'

export const shelvesApi = {
  list: (params: { page?: number; limit?: number; libraryId?: string; genre?: string; position?: string } = {}) =>
    api.get<PaginatedResponse<Shelf>>('/shelves', { params }).then((r) => r.data),

  get: (id: string) => api.get<Shelf>(`/shelves/${id}`).then((r) => r.data),

  create: (data: { code: string; libraryId: string; genre: string; position?: string; location?: string; capacity?: number }) =>
    api.post<Shelf>('/shelves', data).then((r) => r.data),

  update: (id: string, data: Partial<Shelf>) =>
    api.patch<Shelf>(`/shelves/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/shelves/${id}`),

  migratePosition: (fromPosition: string, toPosition: string) =>
    api.post('/shelves/migrate-position', { fromPosition, toPosition }).then((r) => r.data),
}
