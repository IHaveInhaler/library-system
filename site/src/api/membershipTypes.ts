import { api } from './client'

export interface MembershipType {
  id: string
  name: string
  label: string
  durationDays: number | null
  isStaff: boolean
  isBuiltIn: boolean
  order: number
  createdAt: string
  updatedAt: string
}

export const membershipTypesApi = {
  list: () => api.get<MembershipType[]>('/membership-types').then((r) => r.data),

  create: (data: { name: string; label: string; durationDays?: number | null; isStaff?: boolean }) =>
    api.post<MembershipType>('/membership-types', data).then((r) => r.data),

  update: (id: string, data: { label?: string; durationDays?: number | null; isStaff?: boolean }) =>
    api.patch<MembershipType>(`/membership-types/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/membership-types/${id}`),

  reorder: (ids: string[]) => api.post('/membership-types/reorder', { ids }),
}
