import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, ChevronDown, Search } from 'lucide-react'
import { librariesApi } from '../../api/libraries'
import { booksApi } from '../../api/books'
import { PageSpinner } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import type { Shelf } from '../../types'

const positionLabel: Record<string, string> = { L: 'Left', M: 'Middle', R: 'Right' }

// ── Shelf books panel ─────────────────────────────────────────────────────────

function ShelfBooks({ shelf }: { shelf: Shelf }) {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['books', 'shelf', shelf.id, search],
    queryFn: () => booksApi.list({ shelfId: shelf.id, search: search || undefined, limit: 50 }),
  })

  return (
    <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 dark:border-gray-700 dark:bg-gray-800/60">
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books on this shelf…"
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        {data && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{data.meta.total} book{data.meta.total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">Loading…</p>
      ) : !data?.data.length ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">No books found.</p>
      ) : (
        <div className="space-y-1.5">
          {data.data.map((book) => (
            <Link
              key={book.id}
              to={`/books/${book.id}`}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 dark:hover:bg-blue-900/20"
            >
              <BookOpen className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{book.title}</p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{book.author}</p>
              </div>
              {book.availableCount !== undefined && (
                <span className={`text-xs font-medium flex-shrink-0 ${book.availableCount > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                  {book.availableCount > 0 ? `${book.availableCount} available` : 'None available'}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LibraryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [shelfSearch, setShelfSearch] = useState('')
  const [expandedShelf, setExpandedShelf] = useState<string | null>(null)

  const { data: library, isLoading: libLoading } = useQuery({
    queryKey: ['libraries', id],
    queryFn: () => librariesApi.get(id!),
  })

  const { data: shelves, isLoading: shelvesLoading } = useQuery({
    queryKey: ['libraries', id, 'shelves'],
    queryFn: () => librariesApi.shelves(id!),
    enabled: !!id,
  })

  const { data: bookResults, isLoading: booksLoading } = useQuery({
    queryKey: ['books', 'library', id, shelfSearch],
    queryFn: () => booksApi.list({ libraryId: id!, search: shelfSearch, limit: 20 }),
    enabled: !!shelfSearch && !!id,
  })

  const filteredShelves = (shelves ?? []).filter((s) => {
    if (!shelfSearch) return true
    const q = shelfSearch.toLowerCase()
    return (
      s.code.toLowerCase().includes(q) ||
      s.label.toLowerCase().includes(q) ||
      s.genre.toLowerCase().includes(q) ||
      (s.location ?? '').toLowerCase().includes(q)
    )
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

      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Shelves</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={shelfSearch}
            onChange={(e) => setShelfSearch(e.target.value)}
            placeholder="Search shelves & books…"
            className="w-64 rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
        </div>
      </div>

      {shelfSearch && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Books matching "{shelfSearch}"
            {bookResults && <span className="ml-1 font-normal text-gray-400 dark:text-gray-500">({bookResults.meta.total})</span>}
          </h3>
          {booksLoading ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">Searching books…</p>
          ) : !bookResults?.data.length ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">No books found.</p>
          ) : (
            <div className="space-y-1.5">
              {bookResults.data.map((book) => (
                <Link
                  key={book.id}
                  to={`/books/${book.id}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 dark:hover:bg-blue-900/20"
                >
                  <BookOpen className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{book.title}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{book.author}</p>
                  </div>
                  {book.availableCount !== undefined && (
                    <span className={`text-xs font-medium flex-shrink-0 ${book.availableCount > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                      {book.availableCount > 0 ? `${book.availableCount} available` : 'None available'}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {shelvesLoading ? (
        <PageSpinner />
      ) : !filteredShelves.length ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {shelfSearch ? 'No shelves match your search.' : 'No shelves yet.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {filteredShelves.map((shelf, i) => (
            <div key={shelf.id} className={i > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40"
                onClick={() => setExpandedShelf(expandedShelf === shelf.id ? null : shelf.id)}
              >
                <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-mono text-xs font-medium text-gray-700 dark:text-gray-300 w-28 flex-shrink-0">{shelf.label}</span>
                  <span className="text-gray-600 dark:text-gray-400">{shelf.code}</span>
                  <Badge label={shelf.genre.replace('_', ' ')} variant="blue" />
                  <Badge label={positionLabel[shelf.position] ?? shelf.position} variant="gray" />
                  {shelf.location && <span className="text-xs text-gray-400 dark:text-gray-500">{shelf.location}</span>}
                </div>
                <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 mr-2">
                  {shelf._count?.bookCopies ?? 0} books
                </span>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${expandedShelf === shelf.id ? 'rotate-180' : ''}`} />
              </button>
              {expandedShelf === shelf.id && <ShelfBooks shelf={shelf} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
