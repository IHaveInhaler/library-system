import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { api } from '../api/client'

export function OverdueBanner() {
  const user = useAuthStore((s) => s.user)

  const { data } = useQuery({
    queryKey: ['my-overdue-loans', user?.id],
    queryFn: () => api.get(`/users/${user!.id}/loans`).then((r) => r.data),
    enabled: !!user,
    staleTime: 60_000,
  })

  const overdueLoans = (data ?? []).filter((l: any) => l.status === 'OVERDUE')
  if (overdueLoans.length === 0) return null

  const libraries = [...new Set(overdueLoans.map((l: any) => l.bookCopy?.shelf?.library?.name).filter(Boolean))]

  return (
    <div className="bg-red-600 px-4 py-2.5 text-center text-sm font-medium text-white dark:bg-red-700">
      <AlertTriangle className="mr-1.5 inline-block h-4 w-4 align-text-bottom" />
      You have {overdueLoans.length} overdue {overdueLoans.length === 1 ? 'loan' : 'loans'}
      {libraries.length > 0 && <> — please return {overdueLoans.length === 1 ? 'it' : 'them'} to {libraries.join(' or ')}</>}
    </div>
  )
}
