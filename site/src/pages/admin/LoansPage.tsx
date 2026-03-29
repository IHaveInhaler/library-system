import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ClipboardList, Plus, Search, X, RotateCcw, AlertTriangle, CheckCircle, ChevronDown, ShieldAlert } from 'lucide-react'
import { loansApi } from '../../api/loans'
import { damageReportsApi } from '../../api/damageReports'
import { copiesApi } from '../../api/copies'
import { booksApi } from '../../api/books'
import { usersApi } from '../../api/users'
import { librariesApi } from '../../api/libraries'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { LoanStatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { api, extractError } from '../../api/client'
import { DamageWarningBanner } from '../../components/DamageWarningBanner'
import type { User, Book, BookCopy, Loan } from '../../types'

// ── Issue Loan Modal ──────────────────────────────────────────────────────────

function IssueLoanModal({ open, onClose, onSuccess, initialCopyId }: { open: boolean; onClose: () => void; onSuccess: () => void; initialCopyId?: string | null }) {
  const [userSearch, setUserSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const [bookSearch, setBookSearch] = useState('')
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [selectedCopy, setSelectedCopy] = useState<BookCopy | null>(null)
  const [copyLocked, setCopyLocked] = useState(false) // true when pre-filled from scan

  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  // Auto-populate from scanned copy
  const { data: prefillCopy } = useQuery({
    queryKey: ['copies', initialCopyId],
    queryFn: () => copiesApi.get(initialCopyId!),
    enabled: !!initialCopyId && open,
  })

  useEffect(() => {
    if (prefillCopy && open) {
      setSelectedBook(prefillCopy.book as any)
      setSelectedCopy(prefillCopy)
      setCopyLocked(true)
    }
  }, [prefillCopy, open])

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
    enabled: !!selectedBook && !copyLocked,
  })

  const availableCopies = copies?.filter((c) => c.status === 'AVAILABLE') ?? []

  const issueLoan = useMutation({
    mutationFn: () => loansApi.create({ userId: selectedUser!.id, bookCopyId: selectedCopy!.id, dueDate, notes }),
    onSuccess: () => { toast.success('Loan issued'); onSuccess() },
    onError: (err) => toast.error(extractError(err)),
  })

  const reset = () => {
    setUserSearch(''); setSelectedUser(null)
    setBookSearch(''); setSelectedBook(null); setSelectedCopy(null); setCopyLocked(false)
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
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40"
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
          {selectedUser && <DamageWarningBanner userId={selectedUser.id} />}
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
                  <p className="text-xs text-red-500 dark:text-red-400">No available copies</p>
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
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40"
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
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const copyIdParam = params.get('copyId')
  const [issueOpen, setIssueOpen] = useState(!!copyIdParam)
  const [issueCopyId, setIssueCopyId] = useState<string | null>(copyIdParam)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [search, setSearch] = useState('')
  const page = Number(params.get('page') ?? 1)
  const status = params.get('status') ?? ''
  const libraryId = params.get('library') ?? ''
  const qc = useQueryClient()

  const { data: libraries } = useQuery({ queryKey: ['libraries', 'all'], queryFn: () => librariesApi.list({ limit: 100 }) })

  const { data, isLoading } = useQuery({
    queryKey: ['loans', { page, status }],
    queryFn: () => loansApi.list({ page, limit: 20, status: status || undefined }),
  })

  const q = search.toLowerCase()
  const filteredLoans = (data?.data ?? []).filter((loan) => {
    if (libraryId && loan.bookCopy.shelf.library.id !== libraryId) return false
    if (!q) return true
    return loan.bookCopy.book.title.toLowerCase().includes(q)
      || loan.bookCopy.book.author.toLowerCase().includes(q)
      || loan.bookCopy.barcode.toLowerCase().includes(q)
      || loan.user.firstName.toLowerCase().includes(q)
      || loan.user.lastName.toLowerCase().includes(q)
      || loan.user.email.toLowerCase().includes(q)
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Loans</h1>
        <Button onClick={() => setIssueOpen(true)}><Plus className="h-4 w-4" /> Issue Loan</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search book, member, barcode…"
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500" />
        </div>
        <select value={libraryId} onChange={(e) => { const n = new URLSearchParams(params); e.target.value ? n.set('library', e.target.value) : n.delete('library'); n.delete('page'); setParams(n) }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
          <option value="">All libraries</option>
          {libraries?.data.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <div className="flex gap-1.5">
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
      </div>

      {isLoading ? <PageSpinner /> : !filteredLoans.length ? (
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredLoans.map((loan) => (
                <tr key={loan.id} onClick={() => setSelectedLoan(loan)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    <span className="flex items-center gap-1.5">
                      {loan.damageReports && loan.damageReports.some((d) => !d.resolvedAt) && (
                        <AlertTriangle className={`h-3.5 w-3.5 flex-shrink-0 ${loan.damageReports.some((d) => !d.resolvedAt && d.type !== 'MEMBER_REPORT') ? 'text-red-500' : 'text-amber-500'}`} />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/manage/books?search=${encodeURIComponent(loan.bookCopy.book.title)}`) }}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {loan.bookCopy.book.title}
                      </button>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/manage/users?search=${encodeURIComponent(loan.user.email)}`) }}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {loan.user.firstName} {loan.user.lastName}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(loan.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><LoanStatusBadge status={loan.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={data?.meta.totalPages ?? 1} total={data?.meta.total ?? 0} limit={data?.meta.limit ?? 20}
            onPage={(p) => { const n = new URLSearchParams(params); n.set('page', String(p)); setParams(n) }} />
        </div>
      )}

      <IssueLoanModal
        open={issueOpen}
        onClose={() => { setIssueOpen(false); setIssueCopyId(null); if (copyIdParam) setParams((p) => { p.delete('copyId'); return p }) }}
        onSuccess={() => { setIssueOpen(false); setIssueCopyId(null); if (copyIdParam) setParams((p) => { p.delete('copyId'); return p }); qc.invalidateQueries({ queryKey: ['loans'] }) }}
        initialCopyId={issueCopyId}
      />
      {selectedLoan && <LoanDrawer loan={selectedLoan} onClose={() => { setSelectedLoan(null); qc.invalidateQueries({ queryKey: ['loans'] }) }} />}
    </div>
  )
}

// ── Return Book Modal ─────────────────────────────────────────────────────────

function ReturnBookModal({ loan, open, onClose, onSuccess }: { loan: Loan; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { data: loanConfig } = useQuery({
    queryKey: ['loan-config'],
    queryFn: () => api.get('/loans/config').then((r: any) => r.data),
  })

  const conditions: string[] = loanConfig?.conditions ?? ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']
  const [condition, setCondition] = useState(loan.bookCopy.condition || 'GOOD')
  const [copyStatus, setCopyStatus] = useState<'AVAILABLE' | 'DAMAGED' | 'RETIRED'>('AVAILABLE')
  const [reportDamage, setReportDamage] = useState(false)
  const [damageDescription, setDamageDescription] = useState('')

  const returnMutation = useMutation({
    mutationFn: () => loansApi.return(loan.id, { condition, copyStatus, reportDamage, damageDescription: reportDamage ? damageDescription : undefined }),
    onSuccess: () => { toast.success('Book returned'); onSuccess() },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Return Book" size="md">
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{loan.bookCopy.book.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{loan.bookCopy.barcode} · {loan.user.firstName} {loan.user.lastName}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Condition</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {loan.conditionAtCheckout && condition !== loan.conditionAtCheckout && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Was {loan.conditionAtCheckout} at checkout</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Copy Status</label>
          <select value={copyStatus} onChange={(e) => setCopyStatus(e.target.value as any)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            <option value="AVAILABLE">Available</option>
            <option value="DAMAGED">Damaged</option>
            <option value="RETIRED">Retired</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="reportDamage" checked={reportDamage} onChange={(e) => setReportDamage(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <label htmlFor="reportDamage" className="text-sm font-medium text-gray-700 dark:text-gray-300">Report damage against member</label>
        </div>

        {reportDamage && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Damage Description</label>
            <textarea
              value={damageDescription}
              onChange={(e) => setDamageDescription(e.target.value)}
              rows={3}
              placeholder="Describe the damage..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => returnMutation.mutate()} loading={returnMutation.isPending}>Confirm Return</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Loan Detail Drawer ──────────────────────────────────────────────────────

function LoanDrawer({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [notes, setNotes] = useState(loan.notes || '')
  const [editorsExpanded, setEditorsExpanded] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [reportDamageOpen, setReportDamageOpen] = useState(false)
  const [damageDesc, setDamageDesc] = useState('')
  const [damageCondition, setDamageCondition] = useState(loan.bookCopy.condition || '')
  const [resolveId, setResolveId] = useState<string | null>(null)
  const [resolveNote, setResolveNote] = useState('')

  const { data: loanConfig } = useQuery({
    queryKey: ['loan-config'],
    queryFn: () => api.get('/loans/config').then((r: any) => r.data),
  })

  const updateNotes = useMutation({
    mutationFn: () => loansApi.update(loan.id, { notes: notes || undefined }),
    onSuccess: () => { toast.success('Notes saved'); qc.invalidateQueries({ queryKey: ['loans'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  const reportDamageMutation = useMutation({
    mutationFn: async (description: string) => {
      if (damageCondition && damageCondition !== loan.bookCopy.condition) {
        await copiesApi.update(loan.bookCopyId, { condition: damageCondition })
      }
      return damageReportsApi.create({
        loanId: loan.id,
        bookCopyId: loan.bookCopyId,
        type: 'STAFF_REPORT',
        conditionBefore: loan.bookCopy.condition,
        conditionAfter: damageCondition || undefined,
        description,
      })
    },
    onSuccess: () => { toast.success('Damage reported'); setReportDamageOpen(false); setDamageDesc(''); qc.invalidateQueries({ queryKey: ['loans'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution, note }: { id: string; resolution: 'DISMISSED' | 'WARNING' | 'CONFIRMED'; note?: string }) =>
      damageReportsApi.resolve(id, resolution, note),
    onSuccess: () => { toast.success('Report resolved'); setResolveId(null); setResolveNote(''); qc.invalidateQueries({ queryKey: ['loans'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  const renewMutation = useMutation({
    mutationFn: () => loansApi.renew(loan.id),
    onSuccess: () => { toast.success('Loan extended'); onClose() },
    onError: (err) => toast.error(extractError(err)),
  })

  const overdueMutation = useMutation({
    mutationFn: () => loansApi.markOverdue(loan.id),
    onSuccess: () => { toast.success('Marked overdue'); onClose() },
    onError: (err) => toast.error(extractError(err)),
  })

  // Calculate how many days overdue (negative means not yet due)
  const daysOverdue = loan.status === 'OVERDUE'
    ? Math.floor((Date.now() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const renewalCutoff = loanConfig?.renewalCutoffDays ?? 14
  const maxRenewals = loanConfig?.maxRenewals ?? 2
  const renewalDays = loanConfig?.renewalDays ?? 7
  const pastCutoff = daysOverdue > renewalCutoff
  const maxRenewalsReached = loan.renewCount >= maxRenewals

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{loan.bookCopy.book.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{loan.bookCopy.barcode} · {loan.bookCopy.shelf.library.name}</p>
          </div>
          <button onClick={onClose} className="ml-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</p>
            <LoanStatusBadge status={loan.status} />
          </div>

          {/* Details */}
          <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Member</span>
              <button onClick={() => navigate(`/manage/users?search=${encodeURIComponent(loan.user.email)}`)}
                className="font-medium text-blue-600 hover:underline dark:text-blue-400">{loan.user.firstName} {loan.user.lastName}</button>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Email</span>
              <span className="text-gray-700 dark:text-gray-300">{loan.user.email}</span>
            </div>
            {loan.issuedBy && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Approved by</span>
                <button onClick={() => navigate(`/manage/users?search=${encodeURIComponent(loan.issuedBy!.email)}`)}
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400">{loan.issuedBy.firstName} {loan.issuedBy.lastName}</button>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Borrowed</span>
              <span className="text-gray-700 dark:text-gray-300">{new Date(loan.borrowedAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Due</span>
              <span className="font-medium text-gray-900 dark:text-white">{new Date(loan.dueDate).toLocaleDateString()}</span>
            </div>
            {loan.returnedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Returned</span>
                <span className="text-gray-700 dark:text-gray-300">{new Date(loan.returnedAt).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Extensions</span>
              <span className="text-gray-700 dark:text-gray-300">{loan.renewCount} / {maxRenewals} used</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Copy</span>
              <span className="font-mono text-xs text-gray-400">{loan.bookCopy.barcode}</span>
            </div>
          </div>

          {/* Overdue past cutoff warning */}
          {loan.status === 'OVERDUE' && pastCutoff && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-700/50 dark:bg-amber-900/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This loan is {daysOverdue} days overdue and can no longer be extended. Please return the item.
              </p>
            </div>
          )}

          {/* Staff notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Staff Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add internal notes about this loan…"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
            <Button size="sm" className="mt-2" onClick={() => updateNotes.mutate()} loading={updateNotes.isPending}
              disabled={notes === (loan.notes || '')}>
              Save Notes
            </Button>
            {loan.notesEditedBy && loan.notesEditedBy.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setEditorsExpanded(!editorsExpanded)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${editorsExpanded ? 'rotate-180' : ''}`} />
                  Edited by {loan.notesEditedBy.length} staff member{loan.notesEditedBy.length !== 1 ? 's' : ''}
                </button>
                {editorsExpanded && (
                  <ul className="mt-2 space-y-1.5 border-l-2 border-gray-200 pl-3 dark:border-gray-600">
                    {loan.notesEditedBy.map((editor, i) => (
                      <li key={i} className="flex items-center justify-between text-xs">
                        <button
                          onClick={() => navigate(`/manage/users?search=${encodeURIComponent(editor.name)}`)}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {editor.name}
                        </button>
                        <span className="text-gray-400 dark:text-gray-500">{new Date(editor.at).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Damage Reports */}
          {loan.damageReports && loan.damageReports.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Damage Reports</p>
              <div className="space-y-2">
                {loan.damageReports.map((dr) => (
                  <div key={dr.id} className={`rounded-lg border p-3 ${!dr.resolvedAt ? (dr.type === 'MEMBER_REPORT' ? 'border-amber-200 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-900/20' : 'border-red-200 bg-red-50 dark:border-red-700/50 dark:bg-red-900/20') : dr.resolution === 'CONFIRMED' ? 'border-red-200 bg-red-50 dark:border-red-700/50 dark:bg-red-900/20' : dr.resolution === 'WARNING' ? 'border-amber-200 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-900/20' : 'border-green-200 bg-green-50 dark:border-green-700/50 dark:bg-green-900/20'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${!dr.resolvedAt ? (dr.type === 'MEMBER_REPORT' ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400') : dr.resolution === 'CONFIRMED' ? 'text-red-700 dark:text-red-400' : dr.resolution === 'WARNING' ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'}`}>
                        {dr.resolvedAt ? (dr.resolution === 'DISMISSED' ? 'Dismissed' : dr.resolution === 'WARNING' ? 'Warning Issued' : dr.resolution === 'CONFIRMED' ? 'Confirmed Damage' : 'Resolved') : dr.type === 'MEMBER_REPORT' ? 'Member Report' : dr.type === 'STAFF_RETURN' ? 'Return Report' : 'Staff Report'}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(dr.createdAt).toLocaleDateString()}</span>
                    </div>
                    <button onClick={() => navigate(`/manage/users?search=${encodeURIComponent(dr.reportedBy.email)}`)}
                      className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                      {dr.reportedBy.firstName} {dr.reportedBy.lastName}
                    </button>
                    {dr.conditionBefore && dr.conditionAfter && (
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{dr.conditionBefore} → {dr.conditionAfter}</p>
                    )}
                    {dr.description && <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{dr.description}</p>}
                    {dr.resolvedAt ? (
                      <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                        Resolved {new Date(dr.resolvedAt).toLocaleDateString()}{dr.resolvedNote ? ` — ${dr.resolvedNote}` : ''}
                      </p>
                    ) : (
                      <div className="mt-2">
                        {resolveId === dr.id ? (
                          <div className="space-y-1.5">
                            <input value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} placeholder="Note (optional)"
                              className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 placeholder-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500" />
                            <div className="flex flex-wrap gap-1.5">
                              <button onClick={() => resolveMutation.mutate({ id: dr.id, resolution: 'DISMISSED', note: resolveNote || undefined })}
                                className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">
                                Dismiss
                              </button>
                              <button onClick={() => resolveMutation.mutate({ id: dr.id, resolution: 'WARNING', note: resolveNote || undefined })}
                                className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
                                Warn
                              </button>
                              <button onClick={() => resolveMutation.mutate({ id: dr.id, resolution: 'CONFIRMED', note: resolveNote || undefined })}
                                className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400">
                                Confirm
                              </button>
                              <Button size="sm" variant="secondary" onClick={() => { setResolveId(null); setResolveNote('') }}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setResolveId(dr.id)} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                            Resolve
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {loan.status !== 'RETURNED' && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Actions</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setReturnOpen(true)}>
                  <CheckCircle className="h-4 w-4" /> Return
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setReportDamageOpen(!reportDamageOpen)}>
                  <ShieldAlert className="h-4 w-4" /> Report Damage
                </Button>
                {reportDamageOpen && (
                  <div className="w-full space-y-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Condition</label>
                      <select value={damageCondition} onChange={(e) => setDamageCondition(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                        {(loanConfig?.conditions ?? ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']).map((c: string) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {damageCondition !== loan.bookCopy.condition && (
                        <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">Currently {loan.bookCopy.condition}</p>
                      )}
                    </div>
                    <textarea
                      value={damageDesc}
                      onChange={(e) => setDamageDesc(e.target.value)}
                      rows={2}
                      placeholder="Describe the damage..."
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                    />
                    <Button size="sm" onClick={() => reportDamageMutation.mutate(damageDesc)}
                      loading={reportDamageMutation.isPending} disabled={!damageDesc.trim()}>
                      Submit Report
                    </Button>
                  </div>
                )}
                {!pastCutoff && (
                  <>
                    <p className="w-full text-xs text-gray-500 dark:text-gray-400">
                      Extending adds {renewalDays} days to the due date
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => renewMutation.mutate()}
                      loading={renewMutation.isPending}
                      disabled={maxRenewalsReached}
                    >
                      <RotateCcw className="h-4 w-4" /> {maxRenewalsReached ? 'Max extensions reached' : 'Extend'}
                    </Button>
                  </>
                )}
                {loan.status !== 'OVERDUE' && (
                  <Button size="sm" variant="secondary" onClick={() => overdueMutation.mutate()} loading={overdueMutation.isPending}>
                    <AlertTriangle className="h-4 w-4" /> Mark Overdue
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
        {returnOpen && <ReturnBookModal loan={loan} open={returnOpen} onClose={() => setReturnOpen(false)} onSuccess={onClose} />}
      </div>
    </div>
  )
}
