import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { BookOpen, Clock, Bookmark, ShieldAlert } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { usersApi } from '../../api/users'
import { loansApi } from '../../api/loans'
import { damageReportsApi } from '../../api/damageReports'
import { reservationsApi } from '../../api/reservations'
import { settingsApi } from '../../api/settings'
import { PageSpinner } from '../../components/ui/Spinner'
import { LoanStatusBadge, ReservationStatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { extractError } from '../../api/client'
import type { Loan } from '../../types'

export default function DashboardPage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: loans, isLoading: loansLoading } = useQuery({
    queryKey: ['users', user?.id, 'loans'],
    queryFn: () => usersApi.loans(user!.id),
    enabled: !!user,
  })

  const { data: settingsData } = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => settingsApi.getPublic(),
  })
  const maxRenewals = Number(settingsData?.settings['loan.maxRenewals'] || 2)

  const { data: reservations } = useQuery({
    queryKey: ['users', user?.id, 'reservations'],
    queryFn: () => usersApi.reservations(user!.id),
    enabled: !!user,
  })

  const renew = useMutation({
    mutationFn: (id: string) => loansApi.renew(id),
    onSuccess: () => {
      toast.success('Loan renewed')
      qc.invalidateQueries({ queryKey: ['users', user?.id, 'loans'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const cancelReservation = useMutation({
    mutationFn: (id: string) => reservationsApi.cancel(id),
    onSuccess: () => {
      toast.success('Reservation cancelled')
      qc.invalidateQueries({ queryKey: ['users', user?.id, 'reservations'] as const })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const [reportLoan, setReportLoan] = useState<Loan | null>(null)
  const [damageDesc, setDamageDesc] = useState('')
  const [loansPage, setLoansPage] = useState(1)
  const [reservationsPage, setReservationsPage] = useState(1)

  const reportDamage = useMutation({
    mutationFn: () => damageReportsApi.create({
      loanId: reportLoan!.id,
      bookCopyId: reportLoan!.bookCopyId,
      type: 'MEMBER_REPORT',
      description: damageDesc,
    }),
    onSuccess: () => { toast.success('Damage reported — staff will review'); setReportLoan(null); setDamageDesc(''); qc.invalidateQueries({ queryKey: ['loans'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  if (loansLoading) return <PageSpinner />

  const activeLoans = loans?.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE') ?? []
  const pendingReservations = reservations?.filter((r) => r.status === 'PENDING') ?? []

  const ITEMS_PER_PAGE = 3

  const loansTotalPages = Math.max(1, Math.ceil(activeLoans.length / ITEMS_PER_PAGE))
  const reservationsTotalPages = Math.max(1, Math.ceil(pendingReservations.length / ITEMS_PER_PAGE))

  const pagedLoans = activeLoans.slice((loansPage - 1) * ITEMS_PER_PAGE, loansPage * ITEMS_PER_PAGE)
  const pagedReservations = pendingReservations.slice((reservationsPage - 1) * ITEMS_PER_PAGE, reservationsPage * ITEMS_PER_PAGE)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {user?.firstName[0]}{user?.lastName?.[0] ?? ''}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Welcome back, {user?.firstName}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <StatCard icon={BookOpen} label="Active Loans" value={activeLoans.length} color="blue" />
        <StatCard icon={Clock} label="Overdue" value={activeLoans.filter(l => l.status === 'OVERDUE').length} color="red" />
        <StatCard icon={Bookmark} label="Reservations" value={pendingReservations.length} color="yellow" />
      </div>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Active Loans</h2>
        {activeLoans.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No active loans.{' '}
            <Link to="/books" className="text-blue-600 hover:underline dark:text-blue-400">Browse books</Link>
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Book</th>
                  <th className="px-4 py-3 text-left">Condition</th>
                  <th className="px-4 py-3 text-left">Due</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Renewals</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {pagedLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3 font-medium"><Link to={`/books/${loan.bookCopy.book.id}`} className="text-blue-600 hover:underline dark:text-blue-400">{loan.bookCopy.book.title}</Link></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{loan.conditionAtCheckout || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(loan.dueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><LoanStatusBadge status={loan.status} /></td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{loan.renewCount} / {maxRenewals}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setReportLoan(loan)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-amber-500 dark:hover:bg-gray-700" title="Report damage">
                          <ShieldAlert className="h-4 w-4" />
                        </button>
                        <Button size="sm" variant="secondary" onClick={() => renew.mutate(loan.id)} loading={renew.isPending} disabled={loan.renewCount >= maxRenewals}>
                          {loan.renewCount >= maxRenewals ? 'Limit reached' : 'Extend'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loansTotalPages > 1 && (
              <MiniPagination page={loansPage} totalPages={loansTotalPages} onPageChange={setLoansPage} />
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Reservations</h2>
        {pendingReservations.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No pending reservations.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Book</th>
                  <th className="px-4 py-3 text-left">Reserved</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {pagedReservations.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3 font-medium"><Link to={`/books/${r.book.id}`} className="text-blue-600 hover:underline dark:text-blue-400">{r.book.title}</Link></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(r.reservedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><ReservationStatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="danger" onClick={() => cancelReservation.mutate(r.id)} loading={cancelReservation.isPending}>
                        Cancel
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reservationsTotalPages > 1 && (
              <MiniPagination page={reservationsPage} totalPages={reservationsTotalPages} onPageChange={setReservationsPage} />
            )}
          </div>
        )}
      </section>

      {reportLoan && (
        <Modal open={!!reportLoan} onClose={() => { setReportLoan(null); setDamageDesc('') }} title="Report Damage" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Report damage to <span className="font-medium text-gray-900 dark:text-white">{reportLoan.bookCopy.book.title}</span>. Staff will review when the book is returned.
            </p>
            <textarea
              value={damageDesc}
              onChange={(e) => setDamageDesc(e.target.value)}
              rows={3}
              placeholder="Describe what happened..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setReportLoan(null); setDamageDesc('') }}>Cancel</Button>
              <Button onClick={() => reportDamage.mutate()} loading={reportDamage.isPending} disabled={!damageDesc.trim()}>
                Submit Report
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function MiniPagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-end gap-1 px-4 py-2 border-t border-gray-100 dark:border-gray-700">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`min-w-[28px] rounded px-2 py-1 text-xs font-medium transition-colors ${
            p === page
              ? 'bg-blue-600 text-white'
              : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: 'blue' | 'red' | 'yellow' }) {
  const bg = {
    blue: 'bg-blue-50 dark:bg-blue-900/30',
    red: 'bg-red-50 dark:bg-red-900/30',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/30',
  }[color]
  const text = {
    blue: 'text-blue-600 dark:text-blue-400',
    red: 'text-red-600 dark:text-red-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
  }[color]
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className={`inline-flex rounded-lg p-2 ${bg}`}>
        <Icon className={`h-5 w-5 ${text}`} />
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  )
}
