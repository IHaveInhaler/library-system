import { Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Library, Lock } from 'lucide-react'
import { librariesApi } from '../../api/libraries'
import { useAuth, useRole } from '../../hooks/useAuth'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'

export default function LibrariesPage() {
  const { user } = useAuth()
  const { isLibrarian } = useRole()
  const { data, isLoading } = useQuery({
    queryKey: ['libraries'],
    queryFn: () => librariesApi.list({ limit: 50 }),
  })

  if (isLoading) return <PageSpinner />

  // If exactly 1 library and user is a normal member (not librarian/admin), go straight to it
  if (data?.data.length === 1 && !isLibrarian) {
    return <Navigate to={`/libraries/${data.data[0].id}`} replace />
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Libraries</h1>

      {!data?.data.length ? (
        !user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
              <Lock className="h-7 w-7 text-gray-400 dark:text-gray-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Members only</h2>
            <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Our libraries are members-only.{' '}
              <Link to="/login" className="text-blue-600 hover:underline dark:text-blue-400">Log in</Link>
              {' '}or{' '}
              <Link to="/register" className="text-blue-600 hover:underline dark:text-blue-400">register</Link>
              {' '}to browse.
            </p>
          </div>
        ) : (
          <EmptyState icon={Library} title="No libraries found" />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((lib) => (
            <Link
              key={lib.id}
              to={`/libraries/${lib.id}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/40">
                  <Library className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">{lib.name}</h3>
                  {lib.email && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{lib.email}</p>}
                  <p className="mt-1 text-xs font-mono text-gray-400 dark:text-gray-500">prefix: {lib.labelPrefix}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
