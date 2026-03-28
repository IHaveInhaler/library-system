import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Printer, BookOpen, Scan, Search, Layers } from 'lucide-react'
import { shelvesApi } from '../../api/shelves'
import { copiesApi } from '../../api/copies'
import { librariesApi } from '../../api/libraries'
import { settingsApi } from '../../api/settings'
import { api, extractError } from '../../api/client'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
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

function browserPrint(type: 'shelf' | 'copy', code: string) {
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

async function sendPrint(type: 'shelf' | 'copy', code: string, libraryId?: string) {
  try {
    const res = await api.post('/barcodes/print', { type, code, libraryId })
    toast.success(res.data.message || 'Sent to printer')
  } catch (err: any) {
    if (err.response?.data?.code === 'BROWSER_PRINT') {
      browserPrint(type, code)
    } else {
      toast.error(extractError(err))
    }
  }
}

function usePrintMethod() {
  const { data } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get, staleTime: 60_000 })
  return data?.settings['print.method'] || 'browser'
}

function PrintButton({ type, code, libraryId }: { type: 'shelf' | 'copy'; code: string; libraryId?: string }) {
  const method = usePrintMethod()
  const handlePrint = () => {
    if (method === 'browser' && !libraryId) browserPrint(type, code)
    else sendPrint(type, code, libraryId)
  }
  return (
    <button onClick={handlePrint} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300" title="Print barcode">
      <Printer className="h-4 w-4" />
    </button>
  )
}

export { BarcodeImage, PrintButton, browserPrint, sendPrint, usePrintMethod }

export default function BarcodesPage() {
  const [tab, setTab] = useState<'shelves' | 'copies' | 'to-print'>('shelves')
  const [libraryFilter, setLibraryFilter] = useState('')
  const [search, setSearch] = useState('')

  const { data: libraries } = useQuery({ queryKey: ['libraries', 'all'], queryFn: () => librariesApi.list({ limit: 100 }) })

  const tabs = ['shelves', 'copies', 'to-print'] as const
  const tabLabels = { shelves: 'Shelf Labels', copies: 'Copy Barcodes', 'to-print': 'To Print' }

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

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((t) => (
            <button key={t} onClick={() => { setTab(t); setSearch(''); setLibraryFilter('') }}
              className={`px-5 py-2.5 text-sm font-medium transition-colors ${tab === t
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
              {tabLabels[t]}
            </button>
          ))}
        </div>
        {(tab === 'shelves' || tab === 'to-print') && (
          <select value={libraryFilter} onChange={(e) => setLibraryFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            <option value="">All libraries</option>
            {libraries?.data.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>

      {/* Search bar for shelves and copies tabs */}
      {(tab === 'shelves' || tab === 'copies') && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'shelves' ? 'Search by shelf code, label, or library…' : 'Search by barcode, book title, author, ISBN, or shelf…'}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
        </div>
      )}

      {tab === 'shelves' && <ShelvesTab libraryFilter={libraryFilter} search={search} />}
      {tab === 'copies' && <CopiesTab search={search} />}
      {tab === 'to-print' && <ToPrintTab libraryFilter={libraryFilter} />}
    </div>
  )
}

// ── Shelves Tab ──────────────────────────────────────────────────────────────

function ShelvesTab({ libraryFilter, search }: { libraryFilter: string; search: string }) {
  const { data: shelves, isLoading } = useQuery({
    queryKey: ['shelves', 'barcodes', libraryFilter],
    queryFn: () => shelvesApi.list({ limit: 200, libraryId: libraryFilter || undefined }),
  })

  if (isLoading) return <PageSpinner />

  const q = search.toLowerCase()
  const filtered = (shelves?.data ?? []).filter((s) => {
    if (!q) return true
    return s.code.toLowerCase().includes(q)
      || s.label.toLowerCase().includes(q)
      || s.library.name.toLowerCase().includes(q)
  })

  if (filtered.length === 0) return <EmptyState icon={Layers} title="No shelves found" description="Try a different search or filter." />

  return (
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
          {filtered.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
              <td className="px-4 py-3"><BarcodeImage type="shelf" code={s.label} /></td>
              <td className="px-4 py-3">
                <p className="font-mono font-medium text-gray-900 dark:text-white">{s.code}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.library.name}</td>
              <td className="px-4 py-3 text-right"><PrintButton type="shelf" code={s.label} libraryId={s.library.id} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Copies Tab ───────────────────────────────────────────────────────────────

function CopiesTab({ search }: { search: string }) {
  const { data: copies, isLoading } = useQuery({
    queryKey: ['copies', 'barcodes'],
    queryFn: () => copiesApi.list({ limit: 200 }),
  })

  if (isLoading) return <PageSpinner />

  const q = search.toLowerCase()
  const filtered = (copies?.data ?? []).filter((c: any) => {
    if (!q) return true
    return c.barcode.toLowerCase().includes(q)
      || c.book?.title?.toLowerCase().includes(q)
      || c.book?.author?.toLowerCase().includes(q)
      || c.book?.isbn?.toLowerCase().includes(q)
      || c.shelf?.code?.toLowerCase().includes(q)
      || c.shelf?.library?.name?.toLowerCase().includes(q)
  })

  if (filtered.length === 0) return <EmptyState icon={BookOpen} title="No copies found" description="Try a different search." />

  // Group by book
  const grouped = new Map<string, { title: string; copies: any[] }>()
  for (const c of filtered) {
    const bookId = c.book?.id ?? 'unknown'
    if (!grouped.has(bookId)) grouped.set(bookId, { title: c.book?.title ?? 'Unknown', copies: [] })
    grouped.get(bookId)!.copies.push(c)
  }

  return (
    <div className="space-y-3">
      {Array.from(grouped.entries()).map(([bookId, { title, copies: bookCopies }]) => (
        <div key={bookId} className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
            <BookOpen className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
            <Badge label={`${bookCopies.length} ${bookCopies.length === 1 ? 'copy' : 'copies'}`} variant="gray" />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {bookCopies.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <BarcodeImage type="copy" code={c.barcode} />
                  <div>
                    <p className="font-mono text-sm text-gray-900 dark:text-white">{c.barcode}</p>
                    <p className="text-xs text-gray-400">{c.shelf?.library?.name} · {c.shelf?.code}</p>
                  </div>
                </div>
                <PrintButton type="copy" code={c.barcode} libraryId={c.shelf?.library?.id} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── To Print Tab ─────────────────────────────────────────────────────────────

function ToPrintTab({ libraryFilter }: { libraryFilter: string }) {
  // Shelves that have never been printed (we track this by checking if they exist —
  // since we can't track print history, show all shelves without copies as "needs label")
  // For copies, show copies that were recently created (last 7 days) as likely needing printing
  const { data: shelves, isLoading: shelvesLoading } = useQuery({
    queryKey: ['shelves', 'to-print', libraryFilter],
    queryFn: () => shelvesApi.list({ limit: 200, libraryId: libraryFilter || undefined }),
  })
  const { data: copies, isLoading: copiesLoading } = useQuery({
    queryKey: ['copies', 'to-print'],
    queryFn: () => copiesApi.list({ limit: 200 }),
  })

  if (shelvesLoading || copiesLoading) return <PageSpinner />

  // Shelves with no copies likely haven't had labels printed yet
  const emptyShelfList = (shelves?.data ?? []).filter((s) => (s._count?.bookCopies ?? 0) === 0)

  // Recently created copies (last 7 days) — likely need barcode printing
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentCopies = (copies?.data ?? []).filter((c: any) => new Date(c.createdAt) >= sevenDaysAgo)

  const method = usePrintMethod()

  const printAll = async (items: { type: 'shelf' | 'copy'; code: string }[]) => {
    if (method !== 'browser') {
      // Send each label to the printer via API
      let sent = 0
      for (const item of items) {
        try {
          await api.post('/barcodes/print', { type: item.type, code: item.code })
          sent++
        } catch { /* skip failed */ }
      }
      toast.success(`Sent ${sent}/${items.length} labels to printer`)
      return
    }
    const w = window.open('', '_blank', 'width=600,height=800')
    if (!w) return
    const labels = items.map((item) =>
      `<div class="label"><img src="/api/barcodes/${item.type}/${encodeURIComponent(item.code)}" /><p>${item.code}</p></div>`
    ).join('')
    w.document.write(`
      <html><head><title>Print Barcodes</title>
      <style>
        body{margin:20px;font-family:monospace}
        .label{display:inline-flex;flex-direction:column;align-items:center;margin:10px;padding:10px;border:1px dashed #ccc}
        img{height:60px}
        p{margin:4px 0 0;font-size:11px}
        @media print{.label{border:none;break-inside:avoid}}
      </style></head>
      <body>${labels}<script>setTimeout(()=>window.print(),500)</script></body></html>`)
    w.document.close()
  }

  return (
    <div className="space-y-6">
      {/* Empty shelves — likely need labels */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Shelf Labels</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Shelves with no copies — likely need labels printed</p>
          </div>
          {emptyShelfList.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => printAll(emptyShelfList.map((s) => ({ type: 'shelf', code: s.label })))}>
              <Printer className="h-4 w-4" /> Print All ({emptyShelfList.length})
            </Button>
          )}
        </div>
        {emptyShelfList.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-400 dark:border-gray-600 dark:text-gray-500">All shelves have copies — nothing to print</p>
        ) : (
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
                {emptyShelfList.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3"><BarcodeImage type="shelf" code={s.label} /></td>
                    <td className="px-4 py-3">
                      <p className="font-mono font-medium text-gray-900 dark:text-white">{s.code}</p>
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.library.name}</td>
                    <td className="px-4 py-3 text-right"><PrintButton type="shelf" code={s.label} libraryId={s.library.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recently created copies — likely need barcodes */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Copy Barcodes</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Copies created in the last 7 days — likely need barcodes printed</p>
          </div>
          {recentCopies.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => printAll(recentCopies.map((c: any) => ({ type: 'copy', code: c.barcode })))}>
              <Printer className="h-4 w-4" /> Print All ({recentCopies.length})
            </Button>
          )}
        </div>
        {recentCopies.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-400 dark:border-gray-600 dark:text-gray-500">No recent copies to print</p>
        ) : (
          <div className="space-y-3">
            {recentCopies.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <BarcodeImage type="copy" code={c.barcode} />
                  <div>
                    <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">{c.barcode}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {c.book?.title} · {c.shelf?.library?.name} · {c.shelf?.code}
                    </p>
                    <p className="text-xs text-gray-400">Created {new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <PrintButton type="copy" code={c.barcode} libraryId={c.shelf?.library?.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
