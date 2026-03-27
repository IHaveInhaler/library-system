import { api } from './client'
import type { AuthResponse, User } from '../types'

export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  me: () => api.get<User>('/auth/me').then((r) => r.data),
}
