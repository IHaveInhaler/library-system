import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Library } from 'lucide-react'
import { librariesApi } from '../../api/libraries'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'

export default function LibrariesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['libraries'],
    queryFn: () => librariesApi.list({ limit: 50 }),
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Libraries</h1>

      {!data?.data.length ? (
        <EmptyState icon={Library} title="No libraries found" />
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
