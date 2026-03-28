import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, BookOpen, Bookmark, ChevronDown, MapPin, Share2, User } from 'lucide-react'
import { booksApi } from '../../api/books'
import { loansApi } from '../../api/loans'
import { reservationsApi } from '../../api/reservations'
import { PageSpinner } from '../../components/ui/Spinner'
import { Badge, CopyStatusBadge, LoanStatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { useAuth, useRole } from '../../hooks/useAuth'
import { extractError } from '../../api/client'
import type { BookCopy, Loan } from '../../types'

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
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

  const [expandedCopy, setExpandedCopy] = useState<string | null>(null)
  const [loanModal, setLoanModal] = useState<BookCopy | null>(null)

  if (isLoading) return <PageSpinner />
  if (!book) return null

  const available = copies?.filter((c) => c.status === 'AVAILABLE').length ?? 0

  // Staff access: admin has all, others check staffLibraryIds
  const hasStaffAccess = (libraryId: string) => {
    if (!user) return false
    if (user.staffLibraryIds === null) return true // admin
    return user.staffLibraryIds?.includes(libraryId) ?? false
  }

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
            <span className={`text-sm font-semibold ${available > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {available > 0 ? `${available} cop${available === 1 ? 'y' : 'ies'} available` : 'No copies available'}
            </span>
            {isMember && available === 0 && (
              <Button size="sm" onClick={() => reserve.mutate()} loading={reserve.isPending}>
                <Bookmark className="h-4 w-4" /> Reserve
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                toast.success('Link copied!')
              }}
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </Button>
          </div>
        </div>
      </div>

      {/* Copies */}
      {copies && copies.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Copies</h2>
          <div className="space-y-2">
            {copies.map((copy) => (
              <CopyRow
                key={copy.id}
                copy={copy}
                expanded={expandedCopy === copy.id}
                onToggle={() => setExpandedCopy(expandedCopy === copy.id ? null : copy.id)}
                canManage={hasStaffAccess(copy.shelf.library.id)}
                onLoan={() => setLoanModal(copy)}
              />
            ))}
          </div>
        </div>
      )}

      {/* No copies — prompt to reserve */}
      {copies && copies.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-gray-200 py-12 text-center dark:border-gray-700">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No copies of this book exist yet.</p>
          {isMember && (
            <Button size="sm" className="mt-4" onClick={() => reserve.mutate()} loading={reserve.isPending}>
              <Bookmark className="h-4 w-4" /> Reserve this book
            </Button>
          )}
        </div>
      )}

      {/* Loan modal */}
      {loanModal && (
        <IssueLoanModal
          copy={loanModal}
          open={!!loanModal}
          onClose={() => setLoanModal(null)}
          onSuccess={() => {
            setLoanModal(null)
            qc.invalidateQueries({ queryKey: ['books', id, 'copies'] })
          }}
        />
      )}
    </div>
  )
}

// ── Copy Row (expandable) ───────────────────────────────────────────────────

function CopyRow({
  copy,
  expanded,
  onToggle,
  canManage,
  onLoan,
}: {
  copy: BookCopy
  expanded: boolean
  onToggle: () => void
  canManage: boolean
  onLoan: () => void
}) {
  const { data: loans } = useQuery({
    queryKey: ['loans', { bookCopyId: copy.id }],
    queryFn: () => loansApi.list({ bookCopyId: copy.id, limit: 10 }),
    enabled: expanded,
  })

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{copy.barcode}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{copy.shelf.library.name}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{copy.shelf.label}</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge label={copy.condition} variant="gray" />
          <CopyStatusBadge status={copy.status} />
          {canManage && copy.status === 'AVAILABLE' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => { e.stopPropagation(); onLoan() }}
            >
              Issue Loan
            </Button>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-700">
          {/* Shelf location */}
          <div className="mb-4 flex items-start gap-3 rounded-lg bg-blue-50 px-3 py-2.5 dark:bg-blue-900/20">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {copy.shelf.library.name} — Shelf {copy.shelf.code}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Label: <span className="font-mono">{copy.shelf.label}</span>
                {copy.shelf.location && <> · {copy.shelf.location}</>}
              </p>
            </div>
          </div>

          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Loan History</p>
          {!loans ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">Loading...</p>
          ) : loans.data.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">No loan history for this copy.</p>
          ) : (
            <div className="space-y-2">
              {loans.data.map((loan: Loan) => (
                <div key={loan.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/40">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {loan.user.firstName} {loan.user.lastName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(loan.borrowedAt).toLocaleDateString()} — {loan.returnedAt ? new Date(loan.returnedAt).toLocaleDateString() : 'ongoing'}
                    </span>
                    <LoanStatusBadge status={loan.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Issue Loan Modal ────────────────────────────────────────────────────────

function IssueLoanModal({
  copy,
  open,
  onClose,
  onSuccess,
}: {
  copy: BookCopy
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [userSearch, setUserSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  const { data: users } = useQuery({
    queryKey: ['users', 'search', userSearch],
    queryFn: () => import('../../api/users').then((m) => m.usersApi.list({ search: userSearch, limit: 8 })),
    enabled: userSearch.length >= 1 && !selectedUser,
  })

  const issue = useMutation({
    mutationFn: () => loansApi.create({ userId: selectedUser.id, bookCopyId: copy.id, dueDate, notes }),
    onSuccess: () => { toast.success('Loan issued'); onSuccess() },
    onError: (err) => toast.error(extractError(err)),
  })

  const reset = () => { setUserSearch(''); setSelectedUser(null); setDueDate(''); setNotes('') }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Issue Loan">
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-700 dark:bg-blue-900/20">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{copy.book.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{copy.barcode} · {copy.shelf.library.name}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Member</label>
          {selectedUser ? (
            <div className="flex items-center justify-between rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 dark:border-blue-700 dark:bg-blue-900/20">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedUser.firstName} {selectedUser.lastName}</p>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search members..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              />
              {users && users.data.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {users.data.map((u: any) => (
                    <li key={u.id}>
                      <button
                        onClick={() => { setSelectedUser(u); setUserSearch('') }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/40"
                      >
                        <p className="font-medium text-gray-900 dark:text-white">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { reset(); onClose() }}>Cancel</Button>
          <Button onClick={() => issue.mutate()} loading={issue.isPending} disabled={!selectedUser || !dueDate}>
            Issue Loan
          </Button>
        </div>
      </div>
    </Modal>
  )
}
