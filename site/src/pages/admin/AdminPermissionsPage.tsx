import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Lock, ShieldCheck } from 'lucide-react'
import { permissionsApi } from '../../api/permissions'
import { PageSpinner } from '../../components/ui/Spinner'
import { extractError } from '../../api/client'

const PERMISSION_LABELS: Record<string, { label: string; description: string }> = {
  MANAGE_BOOKS:            { label: 'Manage Books',           description: 'Create, edit books and import via ISBN' },
  MANAGE_LIBRARIES:        { label: 'Manage Libraries',       description: 'Create and edit libraries' },
  MANAGE_SHELVES:          { label: 'Manage Shelves',         description: 'Create and edit shelves within libraries' },
  MANAGE_COPIES:           { label: 'Manage Copies',          description: 'Add, update and retire book copies' },
  ISSUE_LOANS:             { label: 'Issue Loans',            description: 'Create new loans for members' },
  RETURN_LOANS:            { label: 'Return Loans',           description: 'Mark loans as returned' },
  VIEW_ALL_LOANS:          { label: 'View All Loans',         description: 'See loans for all members' },
  MANAGE_RESERVATIONS:     { label: 'Manage Reservations',    description: 'Fulfil and cancel reservations' },
  VIEW_ALL_RESERVATIONS:   { label: 'View All Reservations',  description: 'See reservations for all members' },
  MANAGE_MEMBERSHIPS:      { label: 'Manage Memberships',     description: 'Grant and revoke library memberships' },
  MANAGE_USERS:            { label: 'Manage Users',           description: 'View, create and edit user accounts' },
}

const ROLES = ['MEMBER', 'LIBRARIAN'] as const

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
        disabled ? 'cursor-not-allowed opacity-50' :
        checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

export default function AdminPermissionsPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: permissionsApi.get,
  })

  const toggle = useMutation({
    mutationFn: ({ role, permission, granted }: { role: string; permission: string; granted: boolean }) =>
      permissionsApi.set(role, permission, granted),
    onMutate: async ({ role, permission, granted }) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ['permissions'] })
      const prev = qc.getQueryData(['permissions'])
      qc.setQueryData(['permissions'], (old: any) => ({
        ...old,
        matrix: {
          ...old.matrix,
          [role]: { ...old.matrix[role], [permission]: granted },
        },
      }))
      return { prev }
    },
    onError: (err, _vars, ctx) => {
      qc.setQueryData(['permissions'], ctx?.prev)
      toast.error(extractError(err))
    },
    onSuccess: () => {
      toast.success('Permission updated')
    },
  })

  if (isLoading) return <PageSpinner />

  const { permissions, matrix } = data!

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Permissions</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Control what each role can do. Admin permissions are always granted and cannot be changed.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/60">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Permission
              </th>
              {ROLES.map((role) => (
                <th key={role} className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {role}
                </th>
              ))}
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                ADMIN
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {permissions.map((perm) => {
              const meta = PERMISSION_LABELS[perm] ?? { label: perm, description: '' }
              return (
                <tr key={perm} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{meta.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{meta.description}</p>
                  </td>
                  {ROLES.map((role) => (
                    <td key={role} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <Toggle
                          checked={matrix[role]?.[perm] ?? false}
                          onChange={(granted) => toggle.mutate({ role, permission: perm, granted })}
                        />
                      </div>
                    </td>
                  ))}
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
        Changes take effect within 30 seconds as the server caches permissions.
      </p>
    </div>
  )
}
