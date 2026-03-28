import { api } from './client'

export interface Category {
  id: string; name: string; label: string; color: string | null; order: number; createdAt: string; updatedAt: string
}

export const categoriesApi = {
  list: () => api.get<Category[]>('/categories').then(r => r.data),
  create: (data: { name: string; label: string; color?: string }) => api.post<Category>('/categories', data).then(r => r.data),
  update: (id: string, data: { name?: string; label?: string; color?: string }) => api.patch<Category>(`/categories/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/categories/${id}`),
  reorder: (ids: string[]) => api.post('/categories/reorder', { ids }),
}
