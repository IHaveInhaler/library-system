import { api } from './client'
import type { AuthResponse, User } from '../types'

export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string; registrationToken?: string }) =>
    api.post('/auth/register', data).then((r) => r.data),

  verifyEmail: (email: string, code: string) =>
    api.post<{ message: string }>('/auth/verify-email', { email, code }).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  me: () => api.get<User>('/auth/me').then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPasswordWithToken: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }).then((r) => r.data),
}
