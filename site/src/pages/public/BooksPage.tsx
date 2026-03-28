import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Lock, Search } from 'lucide-react'
import { booksApi } from '../../api/books'
import { useAuth } from '../../hooks/useAuth'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { Badge } from '../../components/ui/Badge'
import type { Genre } from '../../types'

const GENRES: Genre[] = ['FICTION', 'NON_FICTION', 'SCIENCE', 'HISTORY', 'BIOGRAPHY', 'TECHNOLOGY', 'ARTS', 'CHILDREN', 'REFERENCE', 'OTHER']

export default function BooksPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 1)
  const search = params.get('search') ?? ''
  const genre = (params.get('genre') ?? '') as Genre | ''

  const { data, isLoading } = useQuery({
    queryKey: ['books', { page, search, genre }],
    queryFn: () => booksApi.list({ page, limit: 20, search: search || undefined, genre: genre || undefined }),
  })

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    next.delete('page')
    setParams(next)
  }

  const showMembersOnly = !user && !search && !genre && !data?.data.length && !isLoading

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Book Catalogue</h1>

      {!showMembersOnly && (
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search by title, author or ISBN…"
              defaultValue={search}
              onKeyDown={(e) => e.key === 'Enter' && setParam('search', e.currentTarget.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
          <select
            value={genre}
            onChange={(e) => setParam('genre', e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All genres</option>
            {GENRES.map((g) => <option key={g} value={g}>{g.replace('_', ' ')}</option>)}
          </select>
        </div>
      )}

      {isLoading ? (
        <PageSpinner />
      ) : !data?.data.length ? (
        !user && !search && !genre ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
              <Lock className="h-7 w-7 text-gray-400 dark:text-gray-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Members only</h2>
            <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Our catalogue is members-only.{' '}
              <Link to="/login" className="text-blue-600 hover:underline dark:text-blue-400">Log in</Link>
              {' '}or{' '}
              <Link to="/register" className="text-blue-600 hover:underline dark:text-blue-400">register</Link>
              {' '}to browse.
            </p>
          </div>
        ) : (
          <EmptyState icon={BookOpen} title="No books found" description="Try a different search or genre filter." />
        )
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.data.map((book) => (
              <Link key={book.id} to={`/books/${book.id}`} className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} className="mb-3 h-40 w-full rounded-lg object-cover" />
                ) : (
                  <div className="mb-3 flex h-40 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                    <BookOpen className="h-10 w-10 text-gray-300 dark:text-gray-500" />
                  </div>
                )}
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2 dark:text-white dark:group-hover:text-blue-400">{book.title}</h3>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{book.author}</p>
                <div className="mt-2 flex items-center justify-between">
                  <Badge label={book.genre.replace('_', ' ')} variant="blue" />
                  {book.availableCount !== undefined && (
                    <span className={`text-xs font-medium ${book.availableCount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                      {book.availableCount > 0 ? `${book.availableCount} available` : 'Unavailable'}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            limit={data.meta.limit}
            onPage={(p) => { const next = new URLSearchParams(params); next.set('page', String(p)); setParams(next) }}
          />
        </>
      )}
    </div>
  )
}
