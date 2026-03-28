import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer, BookOpen, Scan } from 'lucide-react'
import { shelvesApi } from '../../api/shelves'
import { booksApi } from '../../api/books'
import { librariesApi } from '../../api/libraries'
import { PageSpinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

function BarcodeImage({ type, code }: { type: 'shelf' | 'copy'; code: string }) {
  const src = `/api/barcodes/${type}/${encodeURIComponent(code)}`
  return (
    <img
      src={src}
      alt={code}
      className="h-12 bg-white p-1"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}

function PrintButton({ type, code }: { type: 'shelf' | 'copy'; code: string }) {
  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=400,height=300')
    if (!w) return
    w.document.write(`
      <html><head><title>Print ${code}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:monospace}
      img{max-width:80%}p{margin-top:8px;font-size:14px}</style></head>
      <body>
        <img src="/api/barcodes/${type}/${encodeURIComponent(code)}" />
        <p>${code}</p>
        <script>setTimeout(()=>{window.print();window.close()},500)</script>
      </body></html>`)
    w.document.close()
  }
  return (
    <button onClick={handlePrint} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300" title="Print barcode">
      <Printer className="h-4 w-4" />
    </button>
  )
}

export { BarcodeImage, PrintButton }

export default function BarcodesPage() {
  const [tab, setTab] = useState<'shelves' | 'copies'>('shelves')
  const [libraryFilter, setLibraryFilter] = useState('')

  const { data: libraries } = useQuery({ queryKey: ['libraries', 'all'], queryFn: () => librariesApi.list({ limit: 100 }) })
  const { data: shelves, isLoading: shelvesLoading } = useQuery({
    queryKey: ['shelves', 'barcodes', libraryFilter],
    queryFn: () => shelvesApi.list({ limit: 100, libraryId: libraryFilter || undefined }),
    enabled: tab === 'shelves',
  })
  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: ['books', 'barcodes'],
    queryFn: () => booksApi.list({ limit: 100 }),
    enabled: tab === 'copies',
  })

  const tabs = ['shelves', 'copies'] as const

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/manage" className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Manage
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Barcodes</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View and print barcodes for shelves and book copies</p>
        </div>
        <Link to="/manage/scan">
          <Button variant="secondary"><Scan className="h-4 w-4" /> Scan Mode</Button>
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors ${tab === t
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
              {t === 'shelves' ? 'Shelf Labels' : 'Copy Barcodes'}
            </button>
          ))}
        </div>
        {tab === 'shelves' && (
          <select value={libraryFilter} onChange={(e) => setLibraryFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            <option value="">All libraries</option>
            {libraries?.data.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>

      {tab === 'shelves' && (
        shelvesLoading ? <PageSpinner /> : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Barcode</th>
                  <th className="px-4 py-3 text-left">Shelf</th>
                  <th className="px-4 py-3 text-left">Library</th>
                  <th className="px-4 py-3 text-right">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {(shelves?.data ?? []).map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3"><BarcodeImage type="shelf" code={s.label} /></td>
                    <td className="px-4 py-3">
                      <p className="font-mono font-medium text-gray-900 dark:text-white">{s.code}</p>
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.library.name}</td>
                    <td className="px-4 py-3 text-right"><PrintButton type="shelf" code={s.label} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'copies' && (
        booksLoading ? <PageSpinner /> : (
          <div className="space-y-3">
            {(books?.data ?? []).map((book) => (
              <BookCopiesBarcodes key={book.id} bookId={book.id} title={book.title} />
            ))}
          </div>
        )
      )}
    </div>
  )
}

function BookCopiesBarcodes({ bookId, title }: { bookId: string; title: string }) {
  const { data: copies } = useQuery({
    queryKey: ['books', bookId, 'copies'],
    queryFn: () => booksApi.copies(bookId),
  })

  if (!copies?.length) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <BookOpen className="h-4 w-4 text-gray-400" />
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <Badge label={`${copies.length} copies`} variant="gray" />
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {copies.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-3">
              <BarcodeImage type="copy" code={c.barcode} />
              <div>
                <p className="font-mono text-sm text-gray-900 dark:text-white">{c.barcode}</p>
                <p className="text-xs text-gray-400">{c.shelf.library.name} · {c.shelf.code}</p>
              </div>
            </div>
            <PrintButton type="copy" code={c.barcode} />
          </div>
        ))}
      </div>
    </div>
  )
}
