import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Bookmark } from 'lucide-react'
import { reservationsApi } from '../../api/reservations'
import { booksApi } from '../../api/books'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { ReservationStatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { extractError } from '../../api/client'
import type { BookCopy, Reservation } from '../../types'

// ── Fulfill Modal ─────────────────────────────────────────────────────────────

function FulfillModal({
  reservation,
  open,
  onClose,
  onSuccess,
}: {
  reservation: Reservation
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [selectedCopy, setSelectedCopy] = useState<BookCopy | null>(null)

  const { data: copies } = useQuery({
    queryKey: ['books', reservation.bookId, 'copies'],
    queryFn: () => booksApi.copies(reservation.bookId),
    enabled: open,
  })

  const availableCopies = copies?.filter((c) => c.status === 'AVAILABLE' || c.status === 'RESERVED') ?? []

  const fulfill = useMutation({
    mutationFn: () => reservationsApi.fulfill(reservation.id, selectedCopy!.id),
    onSuccess: () => { toast.success('Reservation fulfilled'); onSuccess() },
    onError: (err) => toast.error(extractError(err)),
  })

  const handleClose = () => { setSelectedCopy(null); onClose() }

  return (
    <Modal open={open} onClose={handleClose} title="Fulfill Reservation" size="md">
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/40">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{reservation.book.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Reserved by {reservation.user.firstName} {reservation.user.lastName}
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select a copy to assign
          </label>
          {availableCopies.length === 0 ? (
            <p className="text-sm text-red-500 dark:text-red-400">No available copies for this book</p>
          ) : (
            <div className="space-y-1.5">
              {availableCopies.map((copy) => (
                <button
                  key={copy.id}
                  onClick={() => setSelectedCopy(selectedCopy?.id === copy.id ? null : copy)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    selectedCopy?.id === copy.id
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="font-mono font-medium">{copy.barcode}</span>
                  <span className={`text-xs ${selectedCopy?.id === copy.id ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                    {copy.shelf.library.name} · {copy.condition}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={() => fulfill.mutate()}
            loading={fulfill.isPending}
            disabled={!selectedCopy}
          >
            Fulfill
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const STATUS_TABS = ['', 'PENDING', 'FULFILLED', 'CANCELLED', 'EXPIRED'] as const

export default function ReservationsPage() {
  const [params, setParams] = useSearchParams()
  const [fulfillTarget, setFulfillTarget] = useState<Reservation | null>(null)
  const qc = useQueryClient()
  const navigate = useNavigate()

  const page = Number(params.get('page') ?? 1)
  const status = params.get('status') ?? ''

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', { page, status }],
    queryFn: () => reservationsApi.list({ page, limit: 20, status: status || undefined }),
  })

  const cancel = useMutation({
    mutationFn: reservationsApi.cancel,
    onSuccess: () => { toast.success('Reservation cancelled'); qc.invalidateQueries({ queryKey: ['reservations'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  const setStatus = (s: string) => {
    const n = new URLSearchParams(params)
    s ? n.set('status', s) : n.delete('status')
    n.delete('page')
    setParams(n)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reservations</h1>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              status === s
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : !data?.data.length ? (
        <EmptyState icon={Bookmark} title="No reservations found" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Book</th>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left">Reserved</th>
                <th className="px-4 py-3 text-left">Expires</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.data.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    <button
                      onClick={() => navigate(`/books/${r.bookId}`)}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {r.book.title}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/manage/users?search=${encodeURIComponent(r.user.email)}`) }}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {r.user.firstName} {r.user.lastName}
                    </button>
                    <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">({r.user.email})</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(r.reservedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <ReservationStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'PENDING' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setFulfillTarget(r)}
                        >
                          Fulfill
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => cancel.mutate(r.id)}
                          loading={cancel.isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            limit={data.meta.limit}
            onPage={(p) => {
              const n = new URLSearchParams(params)
              n.set('page', String(p))
              setParams(n)
            }}
          />
        </div>
      )}

      {fulfillTarget && (
        <FulfillModal
          reservation={fulfillTarget}
          open={!!fulfillTarget}
          onClose={() => setFulfillTarget(null)}
          onSuccess={() => {
            setFulfillTarget(null)
            qc.invalidateQueries({ queryKey: ['reservations'] })
          }}
        />
      )}
    </div>
  )
}
