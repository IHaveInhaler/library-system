import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ClipboardList, Search } from 'lucide-react'
import { auditApi } from '../../api/audit'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import type { AuditLog } from '../../types'

const ACTION_COLORS: Record<string, string> = {
  USER_LOGIN: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  USER_REGISTERED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  USER_CREATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  USER_ACTIVATED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  USER_DEACTIVATED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  USER_DELETED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  USER_ROLE_CHANGED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  USER_SESSIONS_REVOKED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  BOOK_CREATED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  BOOK_UPDATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  BOOK_DELETED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

function actionColor(action: string) {
  return ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${actionColor(action)}`}>
      {action.replace(/_/g, ' ')}
    </span>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearch = useCallback((val: string) => {
    setSearchInput(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(val)
      setPage(1)
    }, 350)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['audit', { page, search }],
    queryFn: () => auditApi.list({ page, limit: 50, action: search || undefined }),
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/admin" className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Admin
      </Link>

      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Filter by action…"
            className="w-56 rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : !data?.data.length ? (
        <EmptyState icon={ClipboardList} title="No audit log entries" />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Actor</th>
                  <th className="px-4 py-3 text-left">Target</th>
                  <th className="px-4 py-3 text-right">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.data.map((log: AuditLog) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {log.actorName ?? <span className="text-gray-400 italic">system</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {log.targetName ? (
                        <span>
                          <span className="text-xs text-gray-400">{log.targetType} · </span>
                          {log.targetName}
                        </span>
                      ) : log.targetType ? (
                        <span className="text-xs text-gray-400">{log.targetType}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400 dark:text-gray-500">
                      <span title={new Date(log.createdAt).toLocaleString()}>{timeAgo(log.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.meta.totalPages > 1 && (
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              limit={data.meta.limit}
              onPage={setPage}
            />
          )}
        </>
      )}
    </div>
  )
}
