import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Scan, BookOpen, Layers, ArrowLeft, ExternalLink, ClipboardList, RotateCcw, Plus, Search, Printer, Trash2, AlertTriangle, Ban } from 'lucide-react'
import { api, extractError } from '../../api/client'
import { booksApi } from '../../api/books'
import { copiesApi } from '../../api/copies'
import { Button } from '../../components/ui/Button'
import { Badge, CopyStatusBadge } from '../../components/ui/Badge'

interface ScanResult {
  type: 'shelf' | 'copy' | 'unknown'
  entity: any
}

export default function ScanPage() {
  const [code, setCode] = useState('')
  const [lastScan, setLastScan] = useState('')
  const [scanning, setScanning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastKeystroke = useRef(0)
  const buffer = useRef('')

  const { data: result, isLoading } = useQuery<ScanResult>({
    queryKey: ['scan', lastScan],
    queryFn: () => api.get(`/barcodes/scan/${encodeURIComponent(lastScan)}`).then((r) => r.data),
    enabled: !!lastScan,
  })

  // Scanner detection: rapid keystrokes = scanner
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const now = Date.now()
    const timeSinceLast = now - lastKeystroke.current
    lastKeystroke.current = now

    if (e.key === 'Enter' && code.trim()) {
      setLastScan(code.trim())
      setCode('')
      buffer.current = ''
      return
    }

    // Detect scanner: < 50ms between keystrokes
    if (timeSinceLast < 50 && code.length > 3) {
      setScanning(true)
    } else if (timeSinceLast > 200) {
      setScanning(false)
    }
  }, [code])

  // Auto-focus
  useEffect(() => { inputRef.current?.focus() }, [])

  const reset = () => { setLastScan(''); setCode(''); inputRef.current?.focus() }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/manage" className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Manage
      </Link>

      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40">
          <Scan className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scan Barcode</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Scan a shelf label or book copy barcode, or type it manually
        </p>
      </div>

      {/* Scan input */}
      <div className="mb-8">
        <div className="relative">
          <Scan className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scan or type barcode…"
            autoFocus
            className="w-full rounded-xl border-2 border-gray-200 bg-white py-4 pl-12 pr-4 text-center text-lg font-mono text-gray-900 placeholder-gray-400 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-400"
          />
          {scanning && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
              Scanner detected
            </span>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
          Press Enter to search · USB/Bluetooth scanners auto-detected
        </p>
      </div>

      {/* Results */}
      {lastScan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Scanned: <span className="font-mono font-medium text-gray-900 dark:text-white">{lastScan}</span>
            </p>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Scan again
            </Button>
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Looking up…</p>
            </div>
          ) : result?.type === 'shelf' ? (
            <ShelfResult shelf={result.entity} />
          ) : result?.type === 'copy' ? (
            <CopyResult copy={result.entity} />
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-10 text-center dark:border-gray-600 dark:bg-gray-800/50">
              <Scan className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Not found</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">No shelf or copy matches this barcode</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Shelf Result ────────────────────────────────────────────────────────────

function ShelfResult({ shelf }: { shelf: any }) {
  const qc = useQueryClient()
  const [addingCopy, setAddingCopy] = useState(false)
  const [bookSearch, setBookSearch] = useState('')
  const [createdCopy, setCreatedCopy] = useState<any>(null)

  const { data: bookResults } = useQuery({
    queryKey: ['books', 'search', bookSearch],
    queryFn: () => booksApi.list({ search: bookSearch, limit: 8 }),
    enabled: addingCopy && bookSearch.length >= 2,
  })

  const createCopy = useMutation({
    mutationFn: (bookId: string) => copiesApi.create({ bookId, shelfId: shelf.id }),
    onSuccess: (copy) => {
      toast.success('Copy added to shelf')
      setCreatedCopy(copy)
      setAddingCopy(false)
      setBookSearch('')
      qc.invalidateQueries({ queryKey: ['scan'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const printBarcode = (barcode: string) => {
    const w = window.open('', '_blank', 'width=400,height=300')
    if (!w) return
    w.document.write(`<html><head><title>Print ${barcode}</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:monospace}img{max-width:80%}p{margin-top:8px;font-size:14px}</style></head><body><img src="/api/barcodes/copy/${encodeURIComponent(barcode)}" /><p>${barcode}</p><script>setTimeout(()=>{window.print();window.close()},500)</script></body></html>`)
    w.document.close()
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40">
          <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">Shelf: {shelf.code}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{shelf.library.name} · Label: {shelf.label}</p>
        </div>
        <Badge label="Shelf" variant="purple" />
      </div>

      <div className="flex gap-2">
        <Link to={`/manage/shelves?search=${shelf.code}&library=${shelf.library.id}`}>
          <Button size="sm" variant="secondary"><Layers className="h-4 w-4" /> View Shelf</Button>
        </Link>
        <Link to={`/libraries/${shelf.library.id}`}>
          <Button size="sm" variant="secondary"><ExternalLink className="h-4 w-4" /> Library</Button>
        </Link>
        <Button size="sm" onClick={() => { setAddingCopy(true); setCreatedCopy(null) }}>
          <Plus className="h-4 w-4" /> Add Copy
        </Button>
      </div>

      {/* Add copy flow */}
      {addingCopy && (
        <div className="mt-4 space-y-3 rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-600">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Search for a book to add to this shelf</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={bookSearch}
              onChange={(e) => setBookSearch(e.target.value)}
              placeholder="Search by title, author, ISBN…"
              autoFocus
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
          {bookResults && bookResults.data.length > 0 && (
            <ul className="max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
              {bookResults.data.map((book) => (
                <li key={book.id}>
                  <button
                    onClick={() => createCopy.mutate(book.id)}
                    disabled={createCopy.isPending}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/40"
                  >
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt="" className="h-10 w-7 flex-shrink-0 rounded object-cover" />
                    ) : (
                      <div className="flex h-10 w-7 flex-shrink-0 items-center justify-center rounded bg-gray-100 dark:bg-gray-700">
                        <BookOpen className="h-3 w-3 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 line-clamp-1 dark:text-white">{book.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{book.author} · {book.isbn}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {bookSearch.length >= 2 && bookResults && bookResults.data.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">No books found</p>
          )}
          <Button size="sm" variant="secondary" onClick={() => { setAddingCopy(false); setBookSearch('') }}>Cancel</Button>
        </div>
      )}

      {/* Print barcode prompt after creating copy */}
      {createdCopy && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-700/50 dark:bg-green-900/20">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            Copy created — barcode: <span className="font-mono">{createdCopy.barcode}</span>
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => printBarcode(createdCopy.barcode)}>
              <Printer className="h-4 w-4" /> Print Barcode
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCreatedCopy(null)}>Dismiss</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Copy Result ─────────────────────────────────────────────────────────────

function CopyResult({ copy }: { copy: any }) {
  const qc = useQueryClient()

  const setStatus = useMutation({
    mutationFn: ({ status }: { status: string }) => copiesApi.setStatus(copy.id, status as any),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['scan'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  const deleteCopy = useMutation({
    mutationFn: () => copiesApi.remove(copy.id),
    onSuccess: () => { toast.success('Copy deleted'); qc.invalidateQueries({ queryKey: ['scan'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
          <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-white">{copy.book.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {copy.barcode} · {copy.shelf.library.name} · {copy.book.author}
          </p>
        </div>
        <CopyStatusBadge status={copy.status} />
      </div>

      {copy.activeLoan && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700/50 dark:bg-amber-900/20">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            On loan to {copy.activeLoan.user.firstName} {copy.activeLoan.user.lastName}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Due {new Date(copy.activeLoan.dueDate).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to={`/manage/books?search=${encodeURIComponent(copy.book.title)}`}>
          <Button size="sm" variant="secondary"><BookOpen className="h-4 w-4" /> View Book</Button>
        </Link>
        {copy.status === 'AVAILABLE' && (
          <Link to="/manage/loans">
            <Button size="sm"><ClipboardList className="h-4 w-4" /> Issue Loan</Button>
          </Link>
        )}
        {copy.activeLoan && (
          <Link to="/manage/loans">
            <Button size="sm" variant="secondary"><RotateCcw className="h-4 w-4" /> Return</Button>
          </Link>
        )}
        {copy.status !== 'ON_LOAN' && copy.status !== 'DAMAGED' && (
          <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ status: 'DAMAGED' })} loading={setStatus.isPending}>
            <AlertTriangle className="h-4 w-4" /> Mark Damaged
          </Button>
        )}
        {copy.status !== 'ON_LOAN' && copy.status !== 'RETIRED' && (
          <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ status: 'RETIRED' })} loading={setStatus.isPending}>
            <Ban className="h-4 w-4" /> Retire
          </Button>
        )}
        {copy.status !== 'ON_LOAN' && (
          <button
            onClick={() => { if (confirm('Delete this copy?')) deleteCopy.mutate() }}
            className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
            title="Delete copy"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
