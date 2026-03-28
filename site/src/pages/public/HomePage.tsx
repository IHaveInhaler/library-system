import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Library, Search, Lock } from 'lucide-react'
import { booksApi } from '../../api/books'
import { librariesApi } from '../../api/libraries'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'

export default function HomePage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const { user } = useAuth()

  const { data: books } = useQuery({
    queryKey: ['books', 'featured'],
    queryFn: () => booksApi.list({ limit: 4 }),
  })

  const { data: libraries } = useQuery({
    queryKey: ['libraries', 'home'],
    queryFn: () => librariesApi.list({ limit: 6 }),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim()) navigate(`/books?search=${encodeURIComponent(q.trim())}`)
  }

  const hasBooks = (books?.data.length ?? 0) > 0
  const hasLibraries = (libraries?.data.length ?? 0) > 0
  const nothingVisible = !hasBooks && !hasLibraries && books !== undefined && libraries !== undefined

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 px-4 py-20 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Discover your next read</h1>
          <p className="mt-4 text-lg text-blue-100">Search thousands of books across our library network</p>
          <form onSubmit={handleSearch} className="mt-8 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Title, author or ISBN…"
                className="w-full rounded-xl border border-white/20 bg-white/15 py-3 pl-12 pr-4 text-white placeholder-white/60 shadow-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            <Button type="submit" variant="secondary" size="lg">Search</Button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 space-y-12">
        {/* Private library gate */}
        {nothingVisible && !user && (
          <section className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 rounded-2xl bg-blue-100 p-5 dark:bg-blue-900/30">
              <Lock className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Our libraries are members-only</h2>
            <p className="mt-3 max-w-md text-gray-500 dark:text-gray-400">
              Sign in or create an account to browse our catalogue and discover books available to you.
            </p>
            <div className="mt-8 flex gap-3">
              <Link to="/login">
                <Button size="lg">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" size="lg">Register</Button>
              </Link>
            </div>
          </section>
        )}

        {/* Libraries */}
        {hasLibraries && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Libraries</h2>
              <Link to="/libraries" className="text-sm text-blue-600 hover:underline dark:text-blue-400">View all →</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {libraries!.data.map((lib) => (
                <Link key={lib.id} to={`/libraries/${lib.id}`} className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition dark:border-gray-700 dark:bg-gray-800">
                  <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/40">
                    <Library className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">{lib.name}</p>
                    {lib.email && <p className="text-xs text-gray-500 dark:text-gray-400">{lib.email}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Books */}
        {hasBooks && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Books</h2>
              <Link to="/books" className="text-sm text-blue-600 hover:underline dark:text-blue-400">View all →</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {books!.data.map((book) => (
                <Link key={book.id} to={`/books/${book.id}`} className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition dark:border-gray-700 dark:bg-gray-800">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="mb-3 h-36 w-full rounded-lg object-cover" />
                  ) : (
                    <div className="mb-3 flex h-36 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                      <BookOpen className="h-8 w-8 text-gray-300 dark:text-gray-500" />
                    </div>
                  )}
                  <p className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 line-clamp-2 dark:text-white dark:group-hover:text-blue-400">{book.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{book.author}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
