import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { librariesApi } from '../../api/libraries'
import { PageSpinner } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'

const positionLabel: Record<string, string> = { L: 'Left', M: 'Middle', R: 'Right' }

export default function LibraryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: library, isLoading: libLoading } = useQuery({
    queryKey: ['libraries', id],
    queryFn: () => librariesApi.get(id!),
  })

  const { data: shelves, isLoading: shelvesLoading } = useQuery({
    queryKey: ['libraries', id, 'shelves'],
    queryFn: () => librariesApi.shelves(id!),
    enabled: !!id,
  })

  if (libLoading) return <PageSpinner />
  if (!library) return null

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{library.name}</h1>
        {library.email && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{library.email}</p>}
        <p className="mt-2 font-mono text-xs text-gray-400 dark:text-gray-500">Label prefix: {library.labelPrefix}</p>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Shelves</h2>
      {shelvesLoading ? (
        <PageSpinner />
      ) : !shelves?.length ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No shelves yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Label</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Position</th>
                <th className="px-4 py-3 text-left">Genre</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Copies</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {shelves.map((shelf) => (
                <tr key={shelf.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900 dark:text-white">{shelf.label}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{shelf.code}</td>
                  <td className="px-4 py-3">
                    <Badge label={positionLabel[shelf.position] ?? shelf.position} variant="gray" />
                  </td>
                  <td className="px-4 py-3"><Badge label={shelf.genre.replace('_', ' ')} variant="blue" /></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{shelf.location ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{shelf._count?.bookCopies ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
