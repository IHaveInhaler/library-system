import { api } from './client'

export interface Group {
  id: string
  name: string
  description?: string
  isBuiltIn: boolean
  order: number
  createdAt: string
  updatedAt: string
  permissions: Record<string, boolean>
}

export const groupsApi = {
  list: () => api.get<Group[]>('/groups').then((r) => r.data),

  create: (data: { name: string; description?: string }) =>
    api.post<Group>('/groups', data).then((r) => r.data),

  update: (name: string, data: { name?: string; description?: string }) =>
    api.patch<Group>(`/groups/${name}`, data).then((r) => r.data),

  reorder: (names: string[]) => api.post('/groups/reorder', { names }),

  remove: (name: string) => api.delete(`/groups/${name}`),
}
