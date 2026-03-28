import { api } from './client'
import type { Loan, PaginatedResponse } from '../types'

export const loansApi = {
  list: (params: { page?: number; limit?: number; status?: string; userId?: string; bookCopyId?: string } = {}) =>
    api.get<PaginatedResponse<Loan>>('/loans', { params }).then((r) => r.data),

  get: (id: string) => api.get<Loan>(`/loans/${id}`).then((r) => r.data),

  create: (data: { userId: string; bookCopyId: string; dueDate: string; notes?: string }) =>
    api.post<Loan>('/loans', data).then((r) => r.data),

  return: (id: string) => api.patch<Loan>(`/loans/${id}/return`).then((r) => r.data),

  renew: (id: string) => api.patch<Loan>(`/loans/${id}/renew`).then((r) => r.data),
}
