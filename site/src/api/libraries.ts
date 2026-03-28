import { api } from './client'
import type { Library, LibraryMembership, Shelf, PaginatedResponse } from '../types'

export const librariesApi = {
  list: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api.get<PaginatedResponse<Library>>('/libraries', { params }).then((r) => r.data),

  get: (id: string) => api.get<Library>(`/libraries/${id}`).then((r) => r.data),

  shelves: (id: string) => api.get<Shelf[]>(`/libraries/${id}/shelves`).then((r) => r.data),

  create: (data: { name: string; labelPrefix: string; email?: string; isPrivate?: boolean }) =>
    api.post<Library>('/libraries', data).then((r) => r.data),

  update: (id: string, data: Partial<Library>) =>
    api.patch<Library>(`/libraries/${id}`, data).then((r) => r.data),

  remove: (id: string, opts?: { action?: 'move' | 'delete'; targetLibraryId?: string }) =>
    api.delete(`/libraries/${id}`, { data: opts }),

  memberships: {
    list: (libraryId: string) =>
      api.get<LibraryMembership[]>(`/libraries/${libraryId}/memberships`).then((r) => r.data),

    me: (libraryId: string) =>
      api.get<LibraryMembership | null>(`/libraries/${libraryId}/memberships/me`).then((r) => r.data),

    create: (libraryId: string, data: { userId: string; membershipType?: string; endDate?: string; notes?: string }) =>
      api.post<LibraryMembership>(`/libraries/${libraryId}/memberships`, data).then((r) => r.data),

    update: (libraryId: string, userId: string, data: { isActive?: boolean; endDate?: string | null; notes?: string | null }) =>
      api.patch<LibraryMembership>(`/libraries/${libraryId}/memberships/${userId}`, data).then((r) => r.data),

    remove: (libraryId: string, userId: string) =>
      api.delete(`/libraries/${libraryId}/memberships/${userId}`),
  },
}
