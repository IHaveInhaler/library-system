import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { Users2, Users, ClipboardList, Settings, IdCard, Database, FileImage } from 'lucide-react'
import { usersApi } from '../../api/users'
import { librariesApi } from '../../api/libraries'
import { shelvesApi } from '../../api/shelves'
import { booksApi } from '../../api/books'

const accessControl = [
  { icon: Users2, label: 'Groups & Roles', description: 'Manage roles, permissions, and rank hierarchy', href: '/admin/groups' },
  { icon: IdCard, label: 'Membership Types', description: 'Define membership types — permanent, monthly, staff', href: '/admin/membership-types' },
  { icon: Users, label: 'Users', description: 'View and manage all user accounts', href: '/admin/users' },
]

const systemConfig = [
  { icon: Settings, label: 'Settings', description: 'SMTP, branding, registration, 2FA, barcodes', href: '/admin/settings' },
  { icon: ClipboardList, label: 'Audit Log', description: 'Track actions taken by users across the system', href: '/admin/audit' },
  { icon: Database, label: 'Backups', description: 'Database backups — create, restore, download', href: '/admin/backups' },
  { icon: FileImage, label: 'Files', description: 'Manage uploaded images — avatars, covers, library images', href: '/admin/files' },
]

export default function AdminPage() {
  const results = useQueries({
    queries: [
      { queryKey: ['admin-stats', 'libraries'], queryFn: () => librariesApi.list({ limit: 1 }) },
      { queryKey: ['admin-stats', 'shelves'], queryFn: () => shelvesApi.list({ limit: 1 }) },
      { queryKey: ['admin-stats', 'books'], queryFn: () => booksApi.list({ limit: 1 }) },
      { queryKey: ['admin-stats', 'users'], queryFn: () => usersApi.list({ limit: 1 }) },
    ],
  })

  const [libraryCount, shelfCount, bookCount, userCount] = results.map(
    (r) => ((r.data as any)?.meta?.total as number | undefined)
  )

  const stats = [
    { label: 'Libraries', value: libraryCount, href: '/manage/libraries' },
    { label: 'Shelves', value: shelfCount, href: '/manage/libraries' },
    { label: 'Books', value: bookCount, href: '/manage/books' },
    { label: 'Users', value: userCount, href: '/admin/users' },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Admin</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        System-level configuration. These settings affect all users.
      </p>

      {/* Stats — ManagePage style */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.href}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {s.value !== undefined ? s.value.toLocaleString() : '…'}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Access Control</h2>
          <div className="space-y-2">
            {accessControl.map(({ icon: Icon, label, description, href }) => (
              <Link key={href} to={href} className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition dark:border-gray-700 dark:bg-gray-800">
                <div className="rounded-lg bg-gray-100 p-2 group-hover:bg-blue-100 transition dark:bg-gray-700 dark:group-hover:bg-blue-900/40">
                  <Icon className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition dark:text-gray-400 dark:group-hover:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-blue-600 transition dark:text-white dark:group-hover:text-blue-400">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">System</h2>
          <div className="space-y-2">
            {systemConfig.map(({ icon: Icon, label, description, href }) => (
              <Link key={href} to={href} className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition dark:border-gray-700 dark:bg-gray-800">
                <div className="rounded-lg bg-gray-100 p-2 group-hover:bg-blue-100 transition dark:bg-gray-700 dark:group-hover:bg-blue-900/40">
                  <Icon className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition dark:text-gray-400 dark:group-hover:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-blue-600 transition dark:text-white dark:group-hover:text-blue-400">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
