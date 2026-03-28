import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { BookOpen, Clock, Bookmark } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { usersApi } from '../../api/users'
import { loansApi } from '../../api/loans'
import { reservationsApi } from '../../api/reservations'
import { PageSpinner } from '../../components/ui/Spinner'
import { LoanStatusBadge, ReservationStatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { extractError } from '../../api/client'

export default function DashboardPage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: loans, isLoading: loansLoading } = useQuery({
    queryKey: ['users', user?.id, 'loans'],
    queryFn: () => usersApi.loans(user!.id),
    enabled: !!user,
  })

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

  if (loansLoading) return <PageSpinner />

  const activeLoans = loans?.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE') ?? []
  const pendingReservations = reservations?.filter((r) => r.status === 'PENDING') ?? []

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
                  <th className="px-4 py-3 text-left">Due</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Renewals</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {activeLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{loan.bookCopy.book.title}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(loan.dueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><LoanStatusBadge status={loan.status} /></td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{loan.renewCount} / 2</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => renew.mutate(loan.id)} loading={renew.isPending}>
                        Renew
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                {pendingReservations.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.book.title}</td>
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
          </div>
        )}
      </section>
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
