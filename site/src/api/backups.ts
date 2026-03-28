import { api } from './client'

export interface Backup {
  id: string
  filename: string
  label: string
  size: number
  reason: 'scheduled' | 'pre-delete' | 'manual'
  note: string
  createdAt: string
}

export const backupsApi = {
  list: () => api.get<{ backups: Backup[] }>('/backups').then((r) => r.data),

  create: (note?: string) => api.post<Backup>('/backups', { note }).then((r) => r.data),

  deleteChallenge: (id: string) =>
    api.post<{ method: 'security-key' | 'console-code'; options?: any; message?: string }>(
      `/backups/${id}/delete`, { step: 'challenge' }
    ).then((r) => r.data),

  deleteVerify: (id: string, data: { credential?: any; code?: string }) =>
    api.post<{ success: boolean; message: string }>(
      `/backups/${id}/delete`, { step: 'verify', ...data }
    ).then((r) => r.data),

  download: (id: string) => {
    window.open(`/api/backups/${id}/download`, '_blank')
  },

  restoreChallenge: (id: string) =>
    api.post<{ method: 'security-key' | 'console-code'; options?: any; message?: string }>(
      `/backups/${id}/restore`, { step: 'challenge' }
    ).then((r) => r.data),

  restoreVerify: (id: string, data: { credential?: any; code?: string }) =>
    api.post<{ success: boolean; message: string }>(
      `/backups/${id}/restore`, { step: 'verify', ...data }
    ).then((r) => r.data),
}
