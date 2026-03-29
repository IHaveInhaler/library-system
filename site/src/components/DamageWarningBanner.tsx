import { useQuery } from '@tanstack/react-query'
import { ShieldAlert } from 'lucide-react'
import { damageReportsApi } from '../api/damageReports'

export function DamageWarningBanner({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ['users', userId, 'damage'],
    queryFn: () => damageReportsApi.forUser(userId),
  })

  if (!data || data.count.total === 0) return null

  const { unresolved, warnings, confirmed } = data.count
  const parts: string[] = []
  if (unresolved > 0) parts.push(`${unresolved} unresolved`)
  if (warnings > 0) parts.push(`${warnings} warning${warnings !== 1 ? 's' : ''}`)
  if (confirmed > 0) parts.push(`${confirmed} confirmed`)

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${confirmed > 0 ? 'border-red-200 bg-red-50 dark:border-red-700/50 dark:bg-red-900/20' : 'border-amber-200 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-900/20'}`}>
      <ShieldAlert className={`h-4 w-4 flex-shrink-0 ${confirmed > 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
      <p className={`text-sm ${confirmed > 0 ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
        This member has <span className="font-semibold">{parts.join(', ')}</span> damage report{data.count.total !== 1 ? 's' : ''} on record.
      </p>
    </div>
  )
}
