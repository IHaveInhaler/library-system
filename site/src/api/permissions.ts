import { api } from './client'

export interface PermissionMatrix {
  permissions: string[]
  matrix: Record<string, Record<string, boolean>>
}

export const permissionsApi = {
  get: () => api.get<PermissionMatrix>('/permissions').then((r) => r.data),

  set: (role: string, permission: string, granted: boolean) =>
    api.patch(`/permissions/${role}/${permission}`, { granted }).then((r) => r.data),
}
