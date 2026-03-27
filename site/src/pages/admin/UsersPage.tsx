import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Users, Plus, X, ChevronRight, BookOpen, Bookmark, Library, Search } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { usersApi } from '../../api/users'
import { auditApi } from '../../api/audit'
import { librariesApi } from '../../api/libraries'
import { booksApi } from '../../api/books'
import { loansApi } from '../../api/loans'
import { reservationsApi } from '../../api/reservations'
import { membershipTypesApi } from '../../api/membershipTypes'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { Badge, LoanStatusBadge, ReservationStatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { extractError } from '../../api/client'
import type { User, Loan, Reservation, LibraryMembership, AuditLog } from '../../types'
import { groupsApi } from '../../api/groups'

function useGroups() {
  return useQuery({ queryKey: ['groups'], queryFn: groupsApi.list, staleTime: 60_000 })
}

// ── Role badge ─────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const map: Record<string, 'blue' | 'purple' | 'red'> = { MEMBER: 'blue', LIBRARIAN: 'purple', ADMIN: 'red' }
  return <Badge label={role} variant={map[role] ?? 'gray'} />
}

// ── Add User Modal ─────────────────────────────────────────────────────────────
function AddUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: groups } = useGroups()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'MEMBER' })

  const create = useMutation({
    mutationFn: () => usersApi.create(form),
    onSuccess: () => {
      toast.success('User created — password invite sent')
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
      setForm({ firstName: '', lastName: '', email: '', role: 'MEMBER' })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Add User">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <Input label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          The user will receive an email to set their password. If SMTP is not configured, the link will be logged to the server console.
        </p>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            {(groups ?? []).map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} loading={create.isPending}
            disabled={!form.firstName || !form.lastName || !form.email}>
            Create & Send Invite
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Issue Loan Modal (user pre-filled) ─────────────────────────────────────────
function IssueLoanForUserModal({ user, open, onClose }: { user: User; open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [bookSearch, setBookSearch] = useState('')
  const [selectedBook, setSelectedBook] = useState<any | null>(null)
  const [selectedCopy, setSelectedCopy] = useState<any | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

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

  const availableCopies = copies?.filter((c: any) => c.status === 'AVAILABLE') ?? []

  const issueLoan = useMutation({
    mutationFn: () => loansApi.create({ userId: user.id, bookCopyId: selectedCopy!.id, dueDate, notes }),
    onSuccess: () => {
      toast.success('Loan issued')
      qc.invalidateQueries({ queryKey: ['users', user.id, 'loans'] })
      reset(); onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const reset = () => {
    setBookSearch(''); setSelectedBook(null); setSelectedCopy(null)
    setDueDate(''); setNotes('')
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Issue Loan">
      <div className="space-y-4">
        {/* Pre-filled user */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-700 dark:bg-blue-900/20">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{user.firstName} {user.lastName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>

        {/* Book picker */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Book</label>
          {selectedBook ? (
            <div className="flex items-center justify-between rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 dark:border-blue-700 dark:bg-blue-900/20">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedBook.title}</p>
              <button onClick={() => { setSelectedBook(null); setSelectedCopy(null) }} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} placeholder="Search books…"
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500" />
              {books && books.data.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {books.data.map((b: any) => (
                    <li key={b.id}>
                      <button onClick={() => { setSelectedBook(b); setBookSearch('') }}
                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                        <p className="font-medium text-gray-900 dark:text-white">{b.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{b.author}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Copy picker */}
        {selectedBook && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Copy <span className="text-gray-400">({availableCopies.length} available)</span>
            </label>
            {availableCopies.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No available copies.</p>
            ) : (
              <select value={selectedCopy?.id ?? ''} onChange={(e) => setSelectedCopy(availableCopies.find((c: any) => c.id === e.target.value) ?? null)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                <option value="">Select a copy…</option>
                {availableCopies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.barcode} · {c.shelf?.library?.name} · {c.shelf?.code}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { reset(); onClose() }}>Cancel</Button>
          <Button onClick={() => issueLoan.mutate()} loading={issueLoan.isPending}
            disabled={!selectedCopy || !dueDate}>Issue Loan</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Make Reservation Modal ──────────────────────────────────────────────────────
function MakeReservationModal({ user, open, onClose }: { user: User; open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [bookSearch, setBookSearch] = useState('')
  const [selectedBook, setSelectedBook] = useState<any | null>(null)
  const [notes, setNotes] = useState('')

  const { data: books } = useQuery({
    queryKey: ['books', 'search', bookSearch],
    queryFn: () => booksApi.list({ search: bookSearch, limit: 8 }),
    enabled: bookSearch.length >= 1 && !selectedBook,
  })

  const makeReservation = useMutation({
    mutationFn: () => reservationsApi.create({ bookId: selectedBook!.id, userId: user.id, notes: notes || undefined }),
    onSuccess: () => {
      toast.success('Reservation created')
      qc.invalidateQueries({ queryKey: ['users', user.id, 'reservations'] })
      reset(); onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const reset = () => { setBookSearch(''); setSelectedBook(null); setNotes('') }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Make Reservation">
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-700 dark:bg-blue-900/20">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{user.firstName} {user.lastName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Book</label>
          {selectedBook ? (
            <div className="flex items-center justify-between rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 dark:border-blue-700 dark:bg-blue-900/20">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedBook.title}</p>
              <button onClick={() => setSelectedBook(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} placeholder="Search books…"
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500" />
              {books && books.data.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {books.data.map((b: any) => (
                    <li key={b.id}>
                      <button onClick={() => { setSelectedBook(b); setBookSearch('') }}
                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                        <p className="font-medium text-gray-900 dark:text-white">{b.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{b.author}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { reset(); onClose() }}>Cancel</Button>
          <Button onClick={() => makeReservation.mutate()} loading={makeReservation.isPending} disabled={!selectedBook}>
            Reserve
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Fulfill Reservation Modal (inline, user pre-filled) ────────────────────────
function FulfillReservationModal({ reservation, open, onClose, onSuccess }: { reservation: Reservation; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [selectedCopyId, setSelectedCopyId] = useState('')

  const { data: copies } = useQuery({
    queryKey: ['books', reservation.bookId, 'copies'],
    queryFn: () => booksApi.copies(reservation.bookId),
    enabled: open,
  })
  const available = copies?.filter((c: any) => c.status === 'AVAILABLE' || c.status === 'RESERVED') ?? []

  const fulfill = useMutation({
    mutationFn: () => reservationsApi.fulfill(reservation.id, selectedCopyId),
    onSuccess: () => { toast.success('Reservation fulfilled'); onSuccess() },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Fulfill Reservation" size="md">
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/40">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{reservation.book.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">ISBN {reservation.book.isbn}</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Select copy</label>
          {available.length === 0 ? (
            <p className="text-sm text-red-500">No available copies</p>
          ) : (
            <select value={selectedCopyId} onChange={(e) => setSelectedCopyId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
              <option value="">Select a copy…</option>
              {available.map((c: any) => (
                <option key={c.id} value={c.id}>{c.barcode} · {c.shelf?.library?.name} · {c.condition}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => fulfill.mutate()} loading={fulfill.isPending} disabled={!selectedCopyId}>Fulfill</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Activate Modal ────────────────────────────────────────────────────────────
function ActivateModal({ user, open, onClose, onConfirm }: {
  user: User
  open: boolean
  onClose: () => void
  onConfirm: (reason?: string) => void
}) {
  const [reason, setReason] = useState('')

  const handleClose = () => { setReason(''); onClose() }

  return (
    <Modal open={open} onClose={handleClose} title="Activate Account">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Activate <span className="font-semibold text-gray-900 dark:text-white">{user.firstName} {user.lastName}</span>'s account.
          They will be able to log in again.
        </p>
        {user.deactivationReason && (
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Deactivation reason</p>
            <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{user.deactivationReason}</p>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Reason <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Approved by admin, review completed…"
            rows={2}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={() => { onConfirm(reason.trim() || undefined); setReason('') }}>
            Activate Account
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Deactivate Modal ───────────────────────────────────────────────────────────
function DeactivateModal({ user, open, onClose, onConfirm }: {
  user: User
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')

  const handleClose = () => { setReason(''); onClose() }

  return (
    <Modal open={open} onClose={handleClose} title="Deactivate Account">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You are about to deactivate <span className="font-semibold text-gray-900 dark:text-white">{user.firstName} {user.lastName}</span>.
          They will not be able to log in until reactivated.
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Reason <span className="text-gray-400">(required)</span>
          </label>
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Violation of terms, pending review…"
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            variant="danger"
            disabled={!reason.trim()}
            onClick={() => { onConfirm(reason.trim()); setReason('') }}
          >
            Deactivate Account
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Manage User Drawer ─────────────────────────────────────────────────────────
function ManageUserDrawer({ user, onClose }: { user: User; onClose: () => void }) {
  const { user: currentUser } = useAuth()
  const isSelf = currentUser?.id === user.id
  const qc = useQueryClient()
  const { data: groups } = useGroups()
  const [tab, setTab] = useState<'details' | 'libraries' | 'loans' | 'reservations' | 'activity'>('details')
  const [details, setDetails] = useState({ firstName: user.firstName, lastName: user.lastName, role: user.role })
  const [issueLoanOpen, setIssueLoanOpen] = useState(false)
  const [makeReservationOpen, setMakeReservationOpen] = useState(false)
  const [fulfillTarget, setFulfillTarget] = useState<Reservation | null>(null)
  const [activateOpen, setActivateOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const updateUser = useMutation({
    mutationFn: () => usersApi.update(user.id, details),
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  const toggleActive = useMutation({
    mutationFn: (reason?: string) => usersApi.setActive(user.id, !user.isActive, reason),
    onSuccess: () => { toast.success(user.isActive ? 'Account deactivated' : 'Account activated'); qc.invalidateQueries({ queryKey: ['users'] }); onClose() },
    onError: (err) => toast.error(extractError(err)),
  })

  const revokeSessions = useMutation({
    mutationFn: () => usersApi.revokeSessions(user.id),
    onSuccess: () => toast.success('All sessions revoked'),
    onError: (err) => toast.error(extractError(err)),
  })

  const resetPassword = useMutation({
    mutationFn: () => usersApi.resetPassword(user.id),
    onSuccess: () => setResetSent(true),
    onError: (err) => toast.error(extractError(err)),
  })

  const deleteUser = useMutation({
    mutationFn: () => usersApi.remove(user.id),
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries({ queryKey: ['users'] }); onClose() },
    onError: (err) => toast.error(extractError(err)),
  })

  const { data: loans } = useQuery({
    queryKey: ['users', user.id, 'loans'],
    queryFn: () => usersApi.loans(user.id),
    enabled: tab === 'loans',
  })

  const { data: reservations } = useQuery({
    queryKey: ['users', user.id, 'reservations'],
    queryFn: () => usersApi.reservations(user.id),
    enabled: tab === 'reservations',
  })

  const { data: memberships, refetch: refetchMemberships } = useQuery({
    queryKey: ['users', user.id, 'memberships'],
    queryFn: async () => {
      // Fetch all libraries to find memberships for this user
      const libs = await librariesApi.list({ limit: 100 })
      const all: LibraryMembership[] = []
      await Promise.all(libs.data.map(async (lib) => {
        try {
          const list = await librariesApi.memberships.list(lib.id)
          all.push(...list.filter((m) => m.userId === user.id).map((m) => ({ ...m, library: lib })))
        } catch { /* skip */ }
      }))
      return all
    },
    enabled: tab === 'libraries',
  })

  const { data: userAuditLogs } = useQuery({
    queryKey: ['users', user.id, 'audit'],
    queryFn: () => auditApi.getUserLogs(user.id, { limit: 50 }),
    enabled: tab === 'activity',
  })

  // Add membership state
  const [addMem, setAddMem] = useState(false)
  const [memForm, setMemForm] = useState({ libraryId: '', membershipType: 'PERMANENT', endDate: '' })
  const { data: allLibraries } = useQuery({
    queryKey: ['libraries', 'all'],
    queryFn: () => librariesApi.list({ limit: 100 }),
    enabled: addMem,
  })
  const { data: memTypes } = useQuery({
    queryKey: ['membership-types'],
    queryFn: membershipTypesApi.list,
    enabled: tab === 'libraries',
  })
  const selectedMemType = memTypes?.find((t) => t.name === memForm.membershipType)

  const createMembership = useMutation({
    mutationFn: () => librariesApi.memberships.create(memForm.libraryId, {
      userId: user.id,
      membershipType: memForm.membershipType,
      endDate: memForm.endDate || undefined,
    }),
    onSuccess: () => { toast.success('Membership added'); setAddMem(false); setMemForm({ libraryId: '', membershipType: 'PERMANENT', endDate: '' }); refetchMemberships() },
    onError: (err) => toast.error(extractError(err)),
  })

  const revokeMembership = useMutation({
    mutationFn: (libraryId: string) => librariesApi.memberships.update(libraryId, user.id, { isActive: false }),
    onSuccess: () => { toast.success('Membership revoked'); refetchMemberships() },
    onError: (err) => toast.error(extractError(err)),
  })

  const tabs = ['details', 'libraries', 'loans', 'reservations', 'activity'] as const

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${tab === t
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
              {t === 'libraries' ? 'Memberships' : t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Details ── */}
          {tab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="First name" value={details.firstName} onChange={(e) => setDetails({ ...details, firstName: e.target.value })} />
                <Input label="Last name" value={details.lastName} onChange={(e) => setDetails({ ...details, lastName: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                <select value={details.role} onChange={(e) => setDetails({ ...details, role: e.target.value })}
                  disabled={isSelf}
                  title={isSelf ? 'You cannot change your own role' : undefined}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  {(groups ?? []).map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
                </select>
              </div>
              <div className="pt-2">
                <Button onClick={() => updateUser.mutate()} loading={updateUser.isPending}>Save changes</Button>
              </div>

              {/* Deactivation reason */}
              {!user.isActive && user.deactivationReason && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700/50 dark:bg-amber-900/20">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Deactivation reason</p>
                  <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-300">{user.deactivationReason}</p>
                </div>
              )}

              {/* Account actions */}
              <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    disabled={isSelf}
                    title={isSelf ? 'Cannot change your own account status' : undefined}
                    onClick={() => user.isActive ? setDeactivateOpen(true) : setActivateOpen(true)}
                    loading={toggleActive.isPending}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => revokeSessions.mutate()}
                    loading={revokeSessions.isPending}
                  >
                    Revoke Sessions
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={isSelf}
                    title={isSelf ? 'Cannot reset your own password this way' : undefined}
                    onClick={() => resetPassword.mutate()}
                    loading={resetPassword.isPending}
                  >
                    Reset Password
                  </Button>
                </div>
                {currentUser?.role === 'ADMIN' && (
                  <Button
                    className="w-full"
                    variant="danger"
                    disabled={isSelf}
                    title={isSelf ? 'Cannot delete your own account' : undefined}
                    onClick={() => {
                      if (confirm(`Delete ${user.firstName} ${user.lastName}? This cannot be undone.`)) {
                        deleteUser.mutate()
                      }
                    }}
                    loading={deleteUser.isPending}
                  >
                    Delete Account
                  </Button>
                )}
              </div>
              <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs text-gray-400 dark:text-gray-500">User ID</p>
                <p className="mt-0.5 font-mono text-xs text-gray-600 dark:text-gray-400 break-all">{user.id}</p>
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Joined</p>
                <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          )}

          {/* ── Library Memberships ── */}
          {tab === 'libraries' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Library memberships for this user. Staff memberships grant management access.
              </p>
              {!memberships ? <PageSpinner /> : memberships.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center dark:border-gray-700">
                  <Library className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No library memberships.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {memberships.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${m.isActive ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          <Library className={`h-4 w-4 ${m.isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{(m as any).library?.name ?? m.libraryId}</p>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <span>{m.type?.label ?? m.membershipType}</span>
                            {m.type?.isStaff && (
                              <span className="rounded bg-blue-100 px-1 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">Staff</span>
                            )}
                            {m.endDate && <span>· expires {new Date(m.endDate).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge label={m.isActive ? 'Active' : 'Revoked'} variant={m.isActive ? 'green' : 'gray'} />
                        {m.isActive && (
                          <Button size="sm" variant="danger" onClick={() => revokeMembership.mutate(m.libraryId)} loading={revokeMembership.isPending}>
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {addMem ? (
                <div className="space-y-3 rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-600">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Add membership</p>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Library</label>
                    <select value={memForm.libraryId} onChange={(e) => setMemForm({ ...memForm, libraryId: e.target.value })}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                      <option value="">Select library…</option>
                      {allLibraries?.data.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Membership type</label>
                    <select value={memForm.membershipType} onChange={(e) => setMemForm({ ...memForm, membershipType: e.target.value, endDate: '' })}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                      {(memTypes ?? []).map((t) => {
                        const dur = t.durationMonths
                          ? `${t.durationMonths} month${t.durationMonths > 1 ? 's' : ''}`
                          : t.durationDays
                            ? `${t.durationDays} days`
                            : ''
                        return (
                          <option key={t.name} value={t.name}>
                            {t.label}{t.isStaff ? ' (Staff)' : ''}{dur ? ` — ${dur}` : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  {selectedMemType && !selectedMemType.durationDays && !selectedMemType.durationMonths && !selectedMemType.isStaff && selectedMemType.name !== 'PERMANENT' && (
                    <>
                      <Input label="End date" type="date" value={memForm.endDate} onChange={(e) => setMemForm({ ...memForm, endDate: e.target.value })} />
                      {!memForm.endDate && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">An end date is required for fixed-term memberships.</p>
                      )}
                    </>
                  )}
                  {(selectedMemType?.durationMonths || selectedMemType?.durationDays) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      End date will be auto-set to {selectedMemType.durationMonths ? `${selectedMemType.durationMonths} calendar month${selectedMemType.durationMonths > 1 ? 's' : ''}` : `${selectedMemType.durationDays} days`} from today.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => createMembership.mutate()} loading={createMembership.isPending}
                      disabled={!memForm.libraryId || (selectedMemType && !selectedMemType.durationDays && !selectedMemType.durationMonths && !selectedMemType.isStaff && selectedMemType.name !== 'PERMANENT' && !memForm.endDate)}>
                      Add Membership
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setAddMem(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setAddMem(true)}>
                  <Plus className="h-4 w-4" /> Add Membership
                </Button>
              )}
            </div>
          )}

          {/* ── Loans ── */}
          {tab === 'loans' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setIssueLoanOpen(true)}><Plus className="h-4 w-4" /> Issue Loan</Button>
              </div>
              {!loans ? <PageSpinner /> : loans.length === 0 ? (
                <EmptyState icon={BookOpen} title="No loans" />
              ) : loans.map((loan: Loan) => (
                <div key={loan.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{loan.bookCopy.book.title}</p>
                    <LoanStatusBadge status={loan.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Due {new Date(loan.dueDate).toLocaleDateString()} · {loan.renewCount} renewal{loan.renewCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{loan.bookCopy.shelf.library.name}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Reservations ── */}
          {tab === 'reservations' && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setMakeReservationOpen(true)}><Plus className="h-4 w-4" /> Make Reservation</Button>
              </div>
              {!reservations ? <PageSpinner /> : reservations.length === 0 ? (
                <EmptyState icon={Bookmark} title="No reservations" />
              ) : reservations.map((r: Reservation) => (
                <div key={r.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{r.book.title}</p>
                    {r.status === 'PENDING' ? (
                      <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setFulfillTarget(r) }}>
                        Fulfill
                      </Button>
                    ) : (
                      <ReservationStatusBadge status={r.status} />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Reserved {new Date(r.reservedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── Activity ── */}
          {tab === 'activity' && (
            <div className="space-y-2">
              {!userAuditLogs ? <PageSpinner /> : userAuditLogs.data.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No activity recorded.</p>
              ) : userAuditLogs.data.map((log: AuditLog) => (
                <div key={log.id} className="rounded-lg border border-gray-100 p-3 dark:border-gray-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {log.actorId !== user.id && log.actorName && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">by {log.actorName}</p>
                  )}
                  {log.targetName && log.actorId === user.id && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {log.targetType}: {log.targetName}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ActivateModal
        user={user}
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        onConfirm={(reason) => { toggleActive.mutate(reason); setActivateOpen(false) }}
      />
      <DeactivateModal
        user={user}
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        onConfirm={(reason) => { toggleActive.mutate(reason); setDeactivateOpen(false) }}
      />
      {resetSent && (
        <Modal open={resetSent} onClose={() => setResetSent(false)} title="Reset Link Sent">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A password reset link has been sent to <span className="font-semibold text-gray-900 dark:text-white">{user.email}</span>.
              If SMTP is not configured, the link has been logged to the server console.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setResetSent(false)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
      <IssueLoanForUserModal user={user} open={issueLoanOpen} onClose={() => setIssueLoanOpen(false)} />
      <MakeReservationModal user={user} open={makeReservationOpen} onClose={() => setMakeReservationOpen(false)} />
      {fulfillTarget && (
        <FulfillReservationModal
          reservation={fulfillTarget}
          open={!!fulfillTarget}
          onClose={() => setFulfillTarget(null)}
          onSuccess={() => {
            setFulfillTarget(null)
            qc.invalidateQueries({ queryKey: ['users', user.id, 'reservations'] })
          }}
        />
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [params, setParams] = useSearchParams()
  const [addOpen, setAddOpen] = useState(false)
  const [managed, setManaged] = useState<User | null>(null)

  const { data: groups } = useGroups()
  const page = Number(params.get('page') ?? 1)
  const search = params.get('search') ?? ''
  const role = params.get('role') ?? ''
  const [searchInput, setSearchInput] = useState(search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearchChange = useCallback((val: string) => {
    setSearchInput(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const n = new URLSearchParams(params)
      val ? n.set('search', val) : n.delete('search')
      n.delete('page')
      setParams(n)
    }, 350)
  }, [params, setParams])

  const setParam = useCallback((key: string, value: string) => {
    const n = new URLSearchParams(params)
    value ? n.set(key, value) : n.delete(key)
    n.delete('page')
    setParams(n)
  }, [params, setParams])

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, search, role }],
    queryFn: () => usersApi.list({ page, limit: 20, search: search || undefined, role: role || undefined }),
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add User</Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search name or email…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setParam('role', e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All roles</option>
          {(groups ?? []).map((g) => (
            <option key={g.name} value={g.name}>{g.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? <PageSpinner /> : !data?.data.length ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.data.map((u) => (
                <tr key={u.id} onClick={() => setManaged(u)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold dark:bg-gray-600 dark:text-gray-200">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3">
                    <Badge label={u.isActive ? 'Active' : 'Inactive'} variant={u.isActive ? 'green' : 'gray'} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} limit={data.meta.limit}
            onPage={(p) => { const n = new URLSearchParams(params); n.set('page', String(p)); setParams(n) }} />
        </div>
      )}

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} />
      {managed && <ManageUserDrawer user={managed} onClose={() => setManaged(null)} />}
    </div>
  )
}
