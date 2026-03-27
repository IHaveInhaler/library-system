import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BookOpen, Search, X, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { booksApi } from '../../api/books'
import { copiesApi } from '../../api/copies'
import { loansApi } from '../../api/loans'
import { reservationsApi } from '../../api/reservations'
import { shelvesApi } from '../../api/shelves'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { Badge, CopyStatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { extractError } from '../../api/client'
import { LoanStatusBadge, ReservationStatusBadge } from '../../components/ui/Badge'
import type { Book, BookCopy, Loan, Reservation } from '../../types'

const GENRES = ['FICTION', 'NON_FICTION', 'SCIENCE', 'HISTORY', 'BIOGRAPHY', 'TECHNOLOGY', 'ARTS', 'CHILDREN', 'REFERENCE', 'OTHER'] as const
type Genre = typeof GENRES[number]

// ── Book Detail Drawer ─────────────────────────────────────────────────────────
function BookDrawer({ book, onClose }: { book: Book; onClose: () => void }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'details' | 'copies' | 'loans' | 'reservations'>('details')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // ── Details tab ──
  const [form, setForm] = useState({
    title: book.title,
    author: book.author,
    publisher: book.publisher ?? '',
    publishedYear: book.publishedYear?.toString() ?? '',
    genre: book.genre as Genre,
    description: book.description ?? '',
    language: book.language ?? 'en',
  })

  const updateBook = useMutation({
    mutationFn: () => booksApi.update(book.id, {
      ...form,
      publishedYear: form.publishedYear ? Number(form.publishedYear) : undefined,
      publisher: form.publisher || undefined,
      description: form.description || undefined,
    }),
    onSuccess: () => { toast.success('Book updated'); qc.invalidateQueries({ queryKey: ['books'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  // ── Copies tab ──
  const { data: copies, refetch: refetchCopies } = useQuery({
    queryKey: ['books', book.id, 'copies'],
    queryFn: () => booksApi.copies(book.id),
    enabled: tab === 'copies',
  })

  const deleteCopy = useMutation({
    mutationFn: copiesApi.remove,
    onSuccess: () => { toast.success('Copy removed'); refetchCopies() },
    onError: (err) => toast.error(extractError(err)),
  })

  const updateCopyStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'AVAILABLE' | 'DAMAGED' | 'RETIRED' }) =>
      copiesApi.setStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); refetchCopies() },
    onError: (err) => toast.error(extractError(err)),
  })

  // Add copy form
  const [addCopy, setAddCopy] = useState(false)
  const [copyForm, setCopyForm] = useState({ barcode: '', shelfSearch: '', shelfId: '', condition: 'GOOD' })
  const [shelfQuery, setShelfQuery] = useState('')

  const { data: shelves } = useQuery({
    queryKey: ['shelves', 'search', shelfQuery],
    queryFn: () => shelvesApi.list({ limit: 8 }),
    enabled: addCopy && shelfQuery.length === 0 || shelfQuery.length >= 1,
  })

  const createCopy = useMutation({
    mutationFn: () => {
      const barcode = copyForm.barcode.trim() || `BC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
      return copiesApi.create({ barcode, bookId: book.id, shelfId: copyForm.shelfId, condition: copyForm.condition })
    },
    onSuccess: () => {
      toast.success('Copy added')
      setAddCopy(false)
      setCopyForm({ barcode: '', shelfSearch: '', shelfId: '', condition: 'GOOD' })
      refetchCopies()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  // ── Loans tab ──
  const { data: bookLoans } = useQuery({
    queryKey: ['loans', { bookId: book.id }],
    queryFn: async () => {
      // Get all copies, then fetch loans for each
      const bookCopies = await booksApi.copies(book.id)
      const copyIds = bookCopies.map((c) => c.id)
      if (copyIds.length === 0) return []
      const results = await Promise.all(copyIds.map((id) => loansApi.list({ bookCopyId: id, limit: 50 })))
      return results.flatMap((r) => r.data)
    },
    enabled: tab === 'loans',
  })

  // ── Reservations tab ──
  const { data: bookReservations } = useQuery({
    queryKey: ['reservations', { bookId: book.id }],
    queryFn: () => reservationsApi.list({ bookId: book.id, limit: 50 }),
    enabled: tab === 'reservations',
  })

  // ── Delete book ──
  const deleteBook = useMutation({
    mutationFn: () => booksApi.remove(book.id),
    onSuccess: () => { toast.success('Book deleted'); qc.invalidateQueries({ queryKey: ['books'] }); onClose() },
    onError: (err) => toast.error(extractError(err)),
  })

  const tabs = ['details', 'copies', 'loans', 'reservations'] as const

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white leading-snug">{book.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{book.author} · ISBN {book.isbn}</p>
          </div>
          <button onClick={onClose} className="ml-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors ${tab === t
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Details ── */}
          {tab === 'details' && (
            <div className="space-y-4">
              <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input label="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Publisher" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
                <Input label="Year" type="number" value={form.publishedYear} onChange={(e) => setForm({ ...form, publishedYear: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Genre</label>
                <select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value as Genre })}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  {GENRES.map((g) => <option key={g} value={g}>{g.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
              <Input label="Language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
              <Button onClick={() => updateBook.mutate()} loading={updateBook.isPending}>Save changes</Button>
            </div>
          )}

          {/* ── Copies ── */}
          {tab === 'copies' && (
            <div className="space-y-3">
              {!copies ? <PageSpinner /> : copies.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No copies registered.</p>
              ) : copies.map((copy: BookCopy) => (
                <div key={copy.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">{copy.barcode}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{copy.shelf.library.name} · {copy.shelf.code}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <CopyStatusBadge status={copy.status} />
                      <Badge label={copy.condition} variant="gray" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    {copy.status !== 'ON_LOAN' && (
                      <>
                        {copy.status !== 'AVAILABLE' && (
                          <Button size="sm" variant="secondary" onClick={() => updateCopyStatus.mutate({ id: copy.id, status: 'AVAILABLE' })}>
                            Set Available
                          </Button>
                        )}
                        {copy.status !== 'DAMAGED' && (
                          <Button size="sm" variant="secondary" onClick={() => updateCopyStatus.mutate({ id: copy.id, status: 'DAMAGED' })}>
                            Mark Damaged
                          </Button>
                        )}
                        {copy.status !== 'RETIRED' && (
                          <Button size="sm" variant="secondary" onClick={() => updateCopyStatus.mutate({ id: copy.id, status: 'RETIRED' })}>
                            Retire
                          </Button>
                        )}
                        <Button size="sm" variant="danger" onClick={() => { if (confirm('Delete this copy?')) deleteCopy.mutate(copy.id) }}>
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Add copy */}
              {addCopy ? (
                <div className="space-y-3 rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-600">
                  <div>
                    <Input label="Barcode" value={copyForm.barcode} onChange={(e) => setCopyForm({ ...copyForm, barcode: e.target.value })} placeholder="Leave empty to auto-generate" />
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Leave blank to auto-generate a barcode</p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Shelf</label>
                    {copyForm.shelfId ? (
                      <div className="flex items-center justify-between rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 dark:border-blue-700 dark:bg-blue-900/20">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {shelves?.data.find(s => s.id === copyForm.shelfId)?.code ?? copyForm.shelfId}
                        </span>
                        <button onClick={() => setCopyForm({ ...copyForm, shelfId: '', shelfSearch: '' })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          value={shelfQuery}
                          onChange={(e) => setShelfQuery(e.target.value)}
                          placeholder="Search shelves…"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        {shelves && shelves.data.length > 0 && (
                          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                            {shelves.data.map((s) => (
                              <li key={s.id}>
                                <button onClick={() => { setCopyForm({ ...copyForm, shelfId: s.id, shelfSearch: s.code }); setShelfQuery('') }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                  <span className="font-mono font-medium text-gray-900 dark:text-white">{s.code}</span>
                                  <span className="text-gray-500 dark:text-gray-400">· {s.library?.name} · {s.genre}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Condition</label>
                    <select value={copyForm.condition} onChange={(e) => setCopyForm({ ...copyForm, condition: e.target.value })}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                      {['GOOD', 'FAIR', 'POOR'].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => createCopy.mutate()} loading={createCopy.isPending}
                      disabled={!copyForm.shelfId}>Add Copy</Button>
                    <Button size="sm" variant="secondary" onClick={() => setAddCopy(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setAddCopy(true)}>
                  <Plus className="h-4 w-4" /> Add copy
                </Button>
              )}
            </div>
          )}

          {/* ── Loans ── */}
          {tab === 'loans' && (
            <div className="space-y-3">
              {!bookLoans ? <PageSpinner /> : bookLoans.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No loans for this book.</p>
              ) : bookLoans.map((loan: Loan) => (
                <div key={loan.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{loan.user.firstName} {loan.user.lastName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {loan.bookCopy.barcode} · Borrowed {new Date(loan.borrowedAt).toLocaleDateString()}
                      {loan.returnedAt ? ` · Returned ${new Date(loan.returnedAt).toLocaleDateString()}` : ` · Due ${new Date(loan.dueDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <LoanStatusBadge status={loan.status} />
                </div>
              ))}
            </div>
          )}

          {/* ── Reservations ── */}
          {tab === 'reservations' && (
            <div className="space-y-3">
              {!bookReservations ? <PageSpinner /> : bookReservations.data.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No reservations for this book.</p>
              ) : bookReservations.data.map((r: Reservation) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{r.user.firstName} {r.user.lastName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Reserved {new Date(r.reservedAt).toLocaleDateString()}
                      {r.expiresAt && ` · Expires ${new Date(r.expiresAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <ReservationStatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}

          {/* ── Delete Book ── */}
          <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-700">
            {deleteConfirm ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/20">
                <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" /> Delete this book?
                </div>
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {(copies?.length ?? 0) > 0
                    ? `This book has ${copies!.length} cop${copies!.length === 1 ? 'y' : 'ies'}. Deleting will remove all copies, loans, and reservations.`
                    : 'This action cannot be undone.'}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="danger" onClick={() => deleteBook.mutate()} loading={deleteBook.isPending}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(true)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                <Trash2 className="h-4 w-4" /> Delete book
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ISBN Modal (unchanged) ─────────────────────────────────────────────────────
function IsbnModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [isbn, setIsbn] = useState('')
  const [isbnResult, setIsbnResult] = useState<any>(null)
  const [isbnGenre, setIsbnGenre] = useState<Genre>('OTHER')

  const lookupIsbn = useMutation({
    mutationFn: () => booksApi.lookupIsbn(isbn),
    onSuccess: (d) => { setIsbnResult(d); if (d.book.genre) setIsbnGenre(d.book.genre as Genre) },
    onError: (err) => toast.error(extractError(err)),
  })

  const addFromIsbn = useMutation({
    mutationFn: () => booksApi.createFromIsbn({ isbn, genre: isbnGenre }),
    onSuccess: () => { toast.success('Book added'); onClose(); setIsbn(''); setIsbnResult(null); qc.invalidateQueries({ queryKey: ['books'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <Modal open={open} onClose={() => { onClose(); setIsbnResult(null); setIsbn('') }} title="Add Book by ISBN">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input className="flex-1" placeholder="e.g. 9780743273565" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
          <Button variant="secondary" onClick={() => lookupIsbn.mutate()} loading={lookupIsbn.isPending}>Lookup</Button>
        </div>
        {isbnResult && (
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            {isbnResult.alreadyExists ? (
              <p className="text-sm text-yellow-700 dark:text-yellow-400">⚠ This book already exists in the catalogue.</p>
            ) : (
              <>
                <p className="font-semibold text-gray-900 dark:text-white">{isbnResult.book.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{isbnResult.book.author}</p>
                <div className="mt-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Genre</label>
                  <select value={isbnGenre} onChange={(e) => setIsbnGenre(e.target.value as Genre)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    {GENRES.map((g) => <option key={g} value={g}>{g.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { onClose(); setIsbnResult(null); setIsbn('') }}>Cancel</Button>
          {isbnResult && !isbnResult.alreadyExists && (
            <Button onClick={() => addFromIsbn.mutate()} loading={addFromIsbn.isPending}>Add to Catalogue</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ManageBooksPage() {
  const [params, setParams] = useSearchParams()
  const [isbnOpen, setIsbnOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const page = Number(params.get('page') ?? 1)
  const search = params.get('search') ?? ''

  const { data, isLoading } = useQuery({
    queryKey: ['books', { page, search }],
    queryFn: () => booksApi.list({ page, limit: 20, search: search || undefined }),
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Books</h1>
        <Button onClick={() => setIsbnOpen(true)}><Search className="h-4 w-4" /> Add by ISBN</Button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Search books…"
          defaultValue={search}
          onKeyDown={(e) => { if (e.key === 'Enter') { const n = new URLSearchParams(params); e.currentTarget.value ? n.set('search', e.currentTarget.value) : n.delete('search'); n.delete('page'); setParams(n) } }}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {isLoading ? <PageSpinner /> : !data?.data.length ? (
        <EmptyState icon={BookOpen} title="No books found" action={<Button onClick={() => setIsbnOpen(true)}>Add by ISBN</Button>} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Author</th>
                <th className="px-4 py-3 text-left">ISBN</th>
                <th className="px-4 py-3 text-left">Genre</th>
                <th className="px-4 py-3 text-left">Copies</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.data.map((book) => (
                <tr key={book.id} onClick={() => setSelectedBook(book)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-3 font-medium max-w-48 truncate text-gray-900 dark:text-white">{book.title}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{book.author}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-400">{book.isbn}</td>
                  <td className="px-4 py-3"><Badge label={book.genre.replace('_', ' ')} variant="blue" /></td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{book._count?.copies ?? 0}</td>
                  <td className="px-4 py-3 text-right text-gray-400">›</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} limit={data.meta.limit}
            onPage={(p) => { const n = new URLSearchParams(params); n.set('page', String(p)); setParams(n) }} />
        </div>
      )}

      <IsbnModal open={isbnOpen} onClose={() => setIsbnOpen(false)} />
      {selectedBook && <BookDrawer book={selectedBook} onClose={() => setSelectedBook(null)} />}
    </div>
  )
}
