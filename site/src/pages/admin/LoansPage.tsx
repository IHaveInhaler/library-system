import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ClipboardList, Plus, Search, X } from 'lucide-react'
import { loansApi } from '../../api/loans'
import { booksApi } from '../../api/books'
import { usersApi } from '../../api/users'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { LoanStatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { extractError } from '../../api/client'
import type { User, Book, BookCopy } from '../../types'

// ── Issue Loan Modal ──────────────────────────────────────────────────────────

function IssueLoanModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [userSearch, setUserSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const [bookSearch, setBookSearch] = useState('')
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [selectedCopy, setSelectedCopy] = useState<BookCopy | null>(null)

  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  const { data: users } = useQuery({
    queryKey: ['users', 'search', userSearch],
    queryFn: () => usersApi.list({ search: userSearch, limit: 8 }),
    enabled: userSearch.length >= 1 && !selectedUser,
  })

  const { data: books } = useQuery({
    queryKey: ['books', 'search', bookSearch],
    queryFn: () => booksApi.list({ search: bookSearch, limit: 8 }),
    enabled: bookSearch.length >= 1 && !selectedBook,
  })

  const { data: copies } = useQuery({
    queryKey: ['books', selectedBook?.id, 'copies'],
    queryFn: () => booksApi.copies(selectedBook!.id),
    enabled: !!selectedBook,
  })

  const availableCopies = copies?.filter((c) => c.status === 'AVAILABLE') ?? []

  const issueLoan = useMutation({
    mutationFn: () => loansApi.create({ userId: selectedUser!.id, bookCopyId: selectedCopy!.id, dueDate, notes }),
    onSuccess: () => { toast.success('Loan issued'); onSuccess() },
    onError: (err) => toast.error(extractError(err)),
  })

  const reset = () => {
    setUserSearch(''); setSelectedUser(null)
    setBookSearch(''); setSelectedBook(null); setSelectedCopy(null)
    setDueDate(''); setNotes('')
  }

  const handleClose = () => { reset(); onClose() }

  const canSubmit = selectedUser && selectedCopy && dueDate

  return (
    <Modal open={open} onClose={handleClose} title="Issue Loan" size="lg">
      <div className="space-y-5">

        {/* User picker */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Member</label>
          {selectedUser ? (
            <div className="flex items-center justify-between rounded-lg border border-blue-300 bg-blue-50 px-3 py-2.5 dark:border-blue-700 dark:bg-blue-900/20">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedUser.firstName} {selectedUser.lastName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedUser.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              />
              {users && users.data.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {users.data.map((u) => (
                    <li key={u.id}>
                      <button
                        onClick={() => { setSelectedUser(u); setUserSearch('') }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-600 dark:text-gray-200">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{u.email} · {u.role}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Book picker */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Book</label>
          {selectedBook ? (
            <div className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2.5 dark:border-blue-700 dark:bg-blue-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedBook.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedBook.author} · ISBN {selectedBook.isbn}</p>
                </div>
                <button onClick={() => { setSelectedBook(null); setSelectedCopy(null) }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Copy picker */}
              <div className="mt-3 border-t border-blue-200 pt-3 dark:border-blue-700/50">
                <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                  Available copies ({availableCopies.length})
                </p>
                {availableCopies.length === 0 ? (
                  <p className="text-xs text-red-500">No available copies</p>
                ) : (
                  <div className="space-y-1">
                    {availableCopies.map((copy) => (
                      <button
                        key={copy.id}
                        onClick={() => setSelectedCopy(selectedCopy?.id === copy.id ? null : copy)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                          selectedCopy?.id === copy.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        <span className="font-mono font-medium">{copy.barcode}</span>
                        <span className={selectedCopy?.id === copy.id ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}>
                          {copy.shelf.library.name} · {copy.shelf.code} · {copy.condition}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                placeholder="Search by title, author or ISBN…"
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              />
              {books && books.data.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {books.data.map((b) => (
                    <li key={b.id}>
                      <button
                        onClick={() => { setSelectedBook(b); setBookSearch('') }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{b.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{b.author} · {b.availableCount ?? 0} available</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Due date + notes */}
        <Input label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={() => issueLoan.mutate()} loading={issueLoan.isPending} disabled={!canSubmit}>
            Issue Loan
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoansPage() {
  const [params, setParams] = useSearchParams()
  const [issueOpen, setIssueOpen] = useState(false)
  const page = Number(params.get('page') ?? 1)
  const status = params.get('status') ?? ''
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['loans', { page, status }],
    queryFn: () => loansApi.list({ page, limit: 20, status: status || undefined }),
  })

  const returnLoan = useMutation({
    mutationFn: loansApi.return,
    onSuccess: () => { toast.success('Book returned'); qc.invalidateQueries({ queryKey: ['loans'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Loans</h1>
        <Button onClick={() => setIssueOpen(true)}><Plus className="h-4 w-4" /> Issue Loan</Button>
      </div>

      <div className="mb-4 flex gap-2">
        {['', 'ACTIVE', 'OVERDUE', 'RETURNED'].map((s) => (
          <button
            key={s}
            onClick={() => { const n = new URLSearchParams(params); s ? n.set('status', s) : n.delete('status'); n.delete('page'); setParams(n) }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${status === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? <PageSpinner /> : !data?.data.length ? (
        <EmptyState icon={ClipboardList} title="No loans found" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Book</th>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left">Due</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.data.map((loan) => (
                <tr key={loan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{loan.bookCopy.book.title}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{loan.user.firstName} {loan.user.lastName}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(loan.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><LoanStatusBadge status={loan.status} /></td>
                  <td className="px-4 py-3 text-right">
                    {loan.status !== 'RETURNED' && (
                      <Button size="sm" variant="secondary" onClick={() => returnLoan.mutate(loan.id)} loading={returnLoan.isPending}>
                        Return
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} limit={data.meta.limit}
            onPage={(p) => { const n = new URLSearchParams(params); n.set('page', String(p)); setParams(n) }} />
        </div>
      )}

      <IssueLoanModal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        onSuccess={() => { setIssueOpen(false); qc.invalidateQueries({ queryKey: ['loans'] }) }}
      />
    </div>
  )
}
