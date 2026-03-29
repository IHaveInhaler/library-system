import { useState, useRef, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Scan, BookOpen, Layers, Library, ClipboardList, RotateCcw, AlertTriangle, Ban, Trash2, X } from 'lucide-react'
import { api, extractError } from '../api/client'
import { copiesApi } from '../api/copies'
import { Button } from './ui/Button'
import { CopyStatusBadge } from './ui/Badge'

interface QuickSearchResult {
  type: 'shelf' | 'copy' | 'book' | 'library'
  id: string
  title: string
  subtitle: string
  data: any
}

const iconMap = { shelf: Layers, copy: BookOpen, book: BookOpen, library: Library }
const colorMap = { shelf: 'text-purple-500', copy: 'text-blue-500', book: 'text-green-500', library: 'text-amber-500' }
const labelMap = { shelf: 'Shelf', copy: 'Copy', book: 'Book', library: 'Library' }

export function ScanBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<QuickSearchResult | null>(null)
  const [scannerDetected, setScannerDetected] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastKeystroke = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const [debouncedQuery, setDebouncedQuery] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250)
    return () => clearTimeout(t)
  }, [query])

  const { data: results } = useQuery<QuickSearchResult[]>({
    queryKey: ['quick-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return []
      const items: QuickSearchResult[] = []

      // Barcode scan (exact match)
      try {
        const scan = await api.get(`/barcodes/scan/${encodeURIComponent(debouncedQuery)}`).then((r) => r.data)
        if (scan.type === 'shelf') {
          items.push({ type: 'shelf', id: scan.entity.id, title: scan.entity.code, subtitle: `${scan.entity.library.name} · ${scan.entity.label}`, data: scan.entity })
        } else if (scan.type === 'copy') {
          items.push({ type: 'copy', id: scan.entity.id, title: scan.entity.book.title, subtitle: `${scan.entity.barcode} · ${scan.entity.shelf.library.name}`, data: scan.entity })
        }
      } catch { /* not a barcode */ }

      const [books, shelves, libraries] = await Promise.all([
        api.get('/books', { params: { search: debouncedQuery, limit: 3 } }).then((r) => r.data).catch(() => ({ data: [] })),
        api.get('/shelves', { params: { limit: 50 } }).then((r) => r.data).catch(() => ({ data: [] })),
        api.get('/libraries', { params: { search: debouncedQuery, limit: 3 } }).then((r) => r.data).catch(() => ({ data: [] })),
      ])

      const q = debouncedQuery.toLowerCase()
      const matchedShelves = (shelves.data || []).filter((s: any) =>
        s.code.toLowerCase().includes(q) || s.label.toLowerCase().includes(q) || (s.location ?? '').toLowerCase().includes(q)
      ).slice(0, 3)

      const existingIds = new Set(items.map((i) => i.id))
      for (const s of matchedShelves) {
        if (existingIds.has(s.id)) continue
        items.push({ type: 'shelf', id: s.id, title: s.code, subtitle: `${s.library.name} · ${s.genre}`, data: s })
      }
      for (const b of (books.data || [])) {
        if (existingIds.has(b.id)) continue
        items.push({ type: 'book', id: b.id, title: b.title, subtitle: `${b.author} · ${b.isbn}`, data: b })
      }
      for (const l of (libraries.data || [])) {
        if (existingIds.has(l.id)) continue
        items.push({ type: 'library', id: l.id, title: l.name, subtitle: l.labelPrefix, data: l })
      }

      return items
    },
    enabled: debouncedQuery.length >= 2 && !selected,
    staleTime: 5000,
  })

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const now = Date.now()
    const timeSinceLast = now - lastKeystroke.current
    lastKeystroke.current = now

    if (timeSinceLast < 50 && query.length > 3) setScannerDetected(true)
    else if (timeSinceLast > 200) setScannerDetected(false)

    if (e.key === 'Enter' && query.trim() && results && results.length > 0) {
      handleSelect(results[0])
      e.preventDefault()
    }
    if (e.key === 'Escape') {
      dismiss()
    }
  }, [query, results])

  const handleSelect = (item: QuickSearchResult) => {
    if (item.type === 'copy') {
      setSelected(item)
      setQuery('')
      setOpen(false)
    } else {
      if (item.type === 'shelf') navigate(`/manage/shelves?search=${item.data.code}&library=${item.data.library?.id || ''}`)
      else if (item.type === 'book') navigate(`/manage/books?search=${encodeURIComponent(item.data.title)}`)
      else if (item.type === 'library') navigate(`/manage/libraries`)
      dismiss()
    }
  }

  const dismiss = () => {
    setQuery('')
    setOpen(false)
    setSelected(null)
    inputRef.current?.blur()
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const showDropdown = open && !selected && query.length >= 2 && results && results.length > 0

  return (
    <>
      {/* Backdrop blur when dropdown or copy panel is visible */}
      {(showDropdown || selected) && (
        <div className="fixed inset-0 z-20 bg-black/20 backdrop-blur-[2px]" onClick={dismiss} />
      )}

      <div className="relative z-30 mb-6" ref={containerRef}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); setOpen(true) }}
              onKeyDown={handleKeyDown}
              onFocus={() => setOpen(true)}
              placeholder="Search shelves, books, barcodes, libraries…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-400"
            />
            {scannerDetected && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                Scanner
              </span>
            )}
          </div>
          <Link to="/manage/scan" title="Scan mode">
            <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300">
              <Scan className="h-4 w-4" />
              <span className="hidden sm:inline">Scan</span>
            </button>
          </Link>
        </div>

        {/* Dropdown results */}
        {showDropdown && (
          <ul className="absolute left-0 right-0 mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
            {results!.map((item) => {
              const Icon = iconMap[item.type]
              return (
                <li key={`${item.type}:${item.id}`}>
                  <button
                    onClick={() => handleSelect(item)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-gray-50 dark:hover:bg-gray-700/40"
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${colorMap[item.type]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.subtitle}</p>
                    </div>
                    <span className="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">{labelMap[item.type]}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {/* Inline copy result */}
        {selected && selected.type === 'copy' && (
          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-xs text-gray-400">{selected.data.barcode}</p>
              <button onClick={dismiss} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <InlineCopyResult copy={selected.data} onDismiss={dismiss} />
          </div>
        )}
      </div>
    </>
  )
}

function InlineCopyResult({ copy, onDismiss }: { copy: any; onDismiss: () => void }) {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const setStatus = useMutation({
    mutationFn: ({ status }: { status: string }) => copiesApi.setStatus(copy.id, status as any),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['quick-search'] }); onDismiss() },
    onError: (err) => toast.error(extractError(err)),
  })

  const deleteCopy = useMutation({
    mutationFn: () => copiesApi.remove(copy.id),
    onSuccess: () => { toast.success('Copy deleted'); onDismiss() },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
          <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{copy.book.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{copy.shelf.library.name} · {copy.shelf.code}</p>
        </div>
        <CopyStatusBadge status={copy.status} />
      </div>

      {copy.activeLoan && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700/50 dark:bg-amber-900/20">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            On loan to {copy.activeLoan.user.firstName} {copy.activeLoan.user.lastName} — due {new Date(copy.activeLoan.dueDate).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => { navigate(`/manage/books?search=${encodeURIComponent(copy.book.title)}`); onDismiss() }}>
          <BookOpen className="h-3.5 w-3.5" /> Book
        </Button>
        {copy.status === 'AVAILABLE' && (
          <Link to="/manage/loans" onClick={onDismiss}>
            <Button size="sm"><ClipboardList className="h-3.5 w-3.5" /> Issue Loan</Button>
          </Link>
        )}
        {copy.activeLoan && (
          <Link to="/manage/loans" onClick={onDismiss}>
            <Button size="sm" variant="secondary"><RotateCcw className="h-3.5 w-3.5" /> Return</Button>
          </Link>
        )}
        {copy.status !== 'ON_LOAN' && copy.status !== 'DAMAGED' && (
          <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ status: 'DAMAGED' })} loading={setStatus.isPending}>
            <AlertTriangle className="h-3.5 w-3.5" /> Damaged
          </Button>
        )}
        {copy.status !== 'ON_LOAN' && copy.status !== 'RETIRED' && (
          <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ status: 'RETIRED' })} loading={setStatus.isPending}>
            <Ban className="h-3.5 w-3.5" /> Retire
          </Button>
        )}
        {copy.status !== 'ON_LOAN' && (
          <button onClick={() => { if (confirm('Delete this copy?')) deleteCopy.mutate() }}
            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
