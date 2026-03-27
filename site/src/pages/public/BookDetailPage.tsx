import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, BookOpen, Bookmark } from 'lucide-react'
import { booksApi } from '../../api/books'
import { reservationsApi } from '../../api/reservations'
import { PageSpinner } from '../../components/ui/Spinner'
import { Badge, CopyStatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useRole } from '../../hooks/useAuth'
import { extractError } from '../../api/client'

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isMember } = useRole()
  const qc = useQueryClient()

  const { data: book, isLoading } = useQuery({
    queryKey: ['books', id],
    queryFn: () => booksApi.get(id!),
  })

  const { data: copies } = useQuery({
    queryKey: ['books', id, 'copies'],
    queryFn: () => booksApi.copies(id!),
    enabled: !!id,
  })

  const reserve = useMutation({
    mutationFn: () => reservationsApi.create({ bookId: id! }),
    onSuccess: () => {
      toast.success('Reservation created')
      qc.invalidateQueries({ queryKey: ['books', id] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <PageSpinner />
  if (!book) return null

  const available = copies?.filter((c) => c.status === 'AVAILABLE').length ?? 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex flex-col gap-8 sm:flex-row">
        <div className="shrink-0">
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} className="h-64 w-44 rounded-xl object-cover shadow-md" />
          ) : (
            <div className="flex h-64 w-44 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 shadow-md">
              <BookOpen className="h-12 w-12 text-gray-300 dark:text-gray-600" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{book.title}</h1>
          <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">{book.author}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge label={book.genre.replace('_', ' ')} variant="blue" />
            {book.language && <Badge label={book.language.toUpperCase()} variant="gray" />}
            {book.publishedYear && <Badge label={String(book.publishedYear)} variant="gray" />}
          </div>

          {book.description && (
            <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{book.description}</p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-900 dark:text-gray-200 sm:grid-cols-3">
            {book.publisher && <div><span className="font-medium text-gray-500 dark:text-gray-400">Publisher</span><p>{book.publisher}</p></div>}
            {book.totalPages && <div><span className="font-medium text-gray-500 dark:text-gray-400">Pages</span><p>{book.totalPages}</p></div>}
            <div><span className="font-medium text-gray-500 dark:text-gray-400">ISBN</span><p className="font-mono text-xs">{book.isbn}</p></div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <span className={`text-sm font-semibold ${available > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {available > 0 ? `${available} cop${available === 1 ? 'y' : 'ies'} available` : 'No copies available'}
            </span>
            {isMember && available === 0 && (
              <Button size="sm" onClick={() => reserve.mutate()} loading={reserve.isPending}>
                <Bookmark className="h-4 w-4" /> Reserve
              </Button>
            )}
          </div>
        </div>
      </div>

      {copies && copies.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Copies</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm text-gray-900 dark:text-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-700/60 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Barcode</th>
                  <th className="px-4 py-3 text-left">Library</th>
                  <th className="px-4 py-3 text-left">Shelf label</th>
                  <th className="px-4 py-3 text-left">Condition</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {copies.map((copy) => (
                  <tr key={copy.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3 font-mono text-xs">{copy.barcode}</td>
                    <td className="px-4 py-3">{copy.shelf.library.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{copy.shelf.label}</td>
                    <td className="px-4 py-3">{copy.condition}</td>
                    <td className="px-4 py-3"><CopyStatusBadge status={copy.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
