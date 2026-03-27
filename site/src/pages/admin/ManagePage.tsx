import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, Library, Users, ClipboardList, Bookmark } from 'lucide-react'
import { booksApi } from '../../api/books'
import { loansApi } from '../../api/loans'
import { reservationsApi } from '../../api/reservations'

export default function ManagePage() {
  const { data: activeLoans } = useQuery({
    queryKey: ['loans', 'active'],
    queryFn: () => loansApi.list({ status: 'ACTIVE', limit: 1 }),
  })
  const { data: overdueLoans } = useQuery({
    queryKey: ['loans', 'overdue'],
    queryFn: () => loansApi.list({ status: 'OVERDUE', limit: 1 }),
  })
  const { data: pendingRes } = useQuery({
    queryKey: ['reservations', 'pending'],
    queryFn: () => reservationsApi.list({ status: 'PENDING', limit: 1 }),
  })
  const { data: books } = useQuery({
    queryKey: ['books', 'count'],
    queryFn: () => booksApi.list({ limit: 1 }),
  })

  const stats = [
    { label: 'Active Loans', value: activeLoans?.meta.total ?? '…', color: 'blue', href: '/manage/loans' },
    { label: 'Overdue', value: overdueLoans?.meta.total ?? '…', color: 'red', href: '/manage/loans?status=OVERDUE' },
    { label: 'Pending Reservations', value: pendingRes?.meta.total ?? '…', color: 'yellow', href: '/manage/reservations' },
    { label: 'Books in Catalogue', value: books?.meta.total ?? '…', color: 'green', href: '/manage/books' },
  ]

  const links = [
    { icon: BookOpen, label: 'Manage Books', href: '/manage/books' },
    { icon: Library, label: 'Manage Libraries', href: '/manage/libraries' },
    { icon: ClipboardList, label: 'Loans', href: '/manage/loans' },
    { icon: Bookmark, label: 'Reservations', href: '/manage/reservations' },
    { icon: Users, label: 'Users', href: '/manage/users' },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">Manage</h1>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.href} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition dark:border-gray-700 dark:bg-gray-800">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{String(s.value)}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
          </Link>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Quick links</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(({ icon: Icon, label, href }) => (
          <Link key={href} to={href} className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition dark:border-gray-700 dark:bg-gray-800">
            <div className="rounded-lg bg-gray-100 p-2 group-hover:bg-blue-100 transition dark:bg-gray-700 dark:group-hover:bg-blue-900/40">
              <Icon className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition dark:text-gray-400 dark:group-hover:text-blue-400" />
            </div>
            <span className="font-medium text-gray-900 group-hover:text-blue-600 transition dark:text-white dark:group-hover:text-blue-400">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
