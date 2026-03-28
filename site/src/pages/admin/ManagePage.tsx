import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, Library, Users, ClipboardList, Bookmark, Tag, Layers, Scan, Barcode } from 'lucide-react'
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

  const libraryLinks = [
    { icon: Library, label: 'Libraries', description: 'Manage branches and locations', href: '/manage/libraries' },
    { icon: Layers, label: 'Shelves', description: 'Organise shelving by genre and location', href: '/manage/shelves' },
    { icon: BookOpen, label: 'Books', description: 'Catalogue, ISBN import, copies', href: '/manage/books' },
    { icon: Tag, label: 'Categories', description: 'Genres and classification', href: '/manage/categories' },
    { icon: Barcode, label: 'Barcodes', description: 'View and print barcode labels', href: '/manage/barcodes' },
    { icon: Scan, label: 'Scanner', description: 'Scan shelf and copy barcodes', href: '/manage/scan' },
  ]

  const serviceLinks = [
    { icon: ClipboardList, label: 'Loans', description: 'Issue, return, and renew', href: '/manage/loans' },
    { icon: Bookmark, label: 'Reservations', description: 'Fulfill and manage holds', href: '/manage/reservations' },
    { icon: Users, label: 'Users', description: 'Accounts, memberships, roles', href: '/manage/users' },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">Manage</h1>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.href} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition dark:border-gray-700 dark:bg-gray-800">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{String(s.value)}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        {/* Library Management */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Library Management</h2>
          <div className="space-y-2">
            {libraryLinks.map(({ icon: Icon, label, description, href }) => (
              <Link key={href} to={href} className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition dark:border-gray-700 dark:bg-gray-800">
                <div className="rounded-lg bg-gray-100 p-2 group-hover:bg-blue-100 transition dark:bg-gray-700 dark:group-hover:bg-blue-900/40">
                  <Icon className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition dark:text-gray-400 dark:group-hover:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-blue-600 transition dark:text-white dark:group-hover:text-blue-400">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Member Services */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Member Services</h2>
          <div className="space-y-2">
            {serviceLinks.map(({ icon: Icon, label, description, href }) => (
              <Link key={href} to={href} className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition dark:border-gray-700 dark:bg-gray-800">
                <div className="rounded-lg bg-gray-100 p-2 group-hover:bg-blue-100 transition dark:bg-gray-700 dark:group-hover:bg-blue-900/40">
                  <Icon className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition dark:text-gray-400 dark:group-hover:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-blue-600 transition dark:text-white dark:group-hover:text-blue-400">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
