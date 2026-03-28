import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Scan, BookOpen, Layers, ArrowLeft, ExternalLink, ClipboardList, RotateCcw } from 'lucide-react'
import { api } from '../../api/client'
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
        <Link to={`/manage/shelves?search=${shelf.code}`}>
          <Button size="sm" variant="secondary"><Layers className="h-4 w-4" /> View Shelf</Button>
        </Link>
        <Link to={`/libraries/${shelf.library.id}`}>
          <Button size="sm" variant="secondary"><ExternalLink className="h-4 w-4" /> Library</Button>
        </Link>
      </div>
    </div>
  )
}

// ── Copy Result ─────────────────────────────────────────────────────────────

function CopyResult({ copy }: { copy: any }) {
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

      <div className="flex gap-2">
        <Link to={`/books/${copy.book.id}`}>
          <Button size="sm" variant="secondary"><BookOpen className="h-4 w-4" /> View Book</Button>
        </Link>
        {copy.status === 'AVAILABLE' && (
          <Link to={`/manage/loans`}>
            <Button size="sm"><ClipboardList className="h-4 w-4" /> Issue Loan</Button>
          </Link>
        )}
        {copy.activeLoan && (
          <Link to={`/manage/loans`}>
            <Button size="sm" variant="secondary"><RotateCcw className="h-4 w-4" /> Return</Button>
          </Link>
        )}
      </div>
    </div>
  )
}
