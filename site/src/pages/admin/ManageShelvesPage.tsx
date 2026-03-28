import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Layers, Plus, Search, X, Trash2, MapPin, Settings2, BookOpen, Printer } from 'lucide-react'
import { shelvesApi } from '../../api/shelves'
import { librariesApi } from '../../api/libraries'
import { categoriesApi } from '../../api/categories'
import { booksApi } from '../../api/books'
import { copiesApi } from '../../api/copies'
import { settingsApi } from '../../api/settings'
import { PrintButton } from './BarcodesPage'
import { CopyStatusBadge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { extractError } from '../../api/client'
import type { Shelf } from '../../types'

const DEFAULT_POSITIONS = [
  { code: 'L', label: 'Left' },
  { code: 'M', label: 'Middle' },
  { code: 'R', label: 'Right' },
]

function usePositions() {
  const { data } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get, staleTime: 60_000 })
  try {
    const raw = data?.settings['shelf.positions']
    if (raw) return JSON.parse(raw) as { code: string; label: string }[]
  } catch { /* ignore */ }
  return DEFAULT_POSITIONS
}

// ── Manage Positions Modal ──────────────────────────────────────────────────

function ManagePositionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const positions = usePositions()
  const [items, setItems] = useState(positions)
  const [newCode, setNewCode] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [migrateFrom, setMigrateFrom] = useState('')
  const [migrateTo, setMigrateTo] = useState('')
  const [showMigrate, setShowMigrate] = useState(false)

  useEffect(() => { setItems(positions) }, [open])

  const save = useMutation({
    mutationFn: () => {
      if (items.length === 0) { toast.error('Must have at least one position'); return Promise.reject() }
      return settingsApi.update({ 'shelf.positions': JSON.stringify(items) })
    },
    onSuccess: (res) => { toast.success('Positions saved'); qc.setQueryData(['settings'], res); qc.invalidateQueries({ queryKey: ['shelves'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  const migrate = useMutation({
    mutationFn: () => shelvesApi.migratePosition(migrateFrom, migrateTo),
    onSuccess: (data: any) => {
      toast.success(`Migrated ${data.migrated} shelves`)
      setShowMigrate(false)
      qc.invalidateQueries({ queryKey: ['shelves'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const addPosition = () => {
    const code = newCode.toUpperCase().trim()
    if (!code || !newLabel.trim()) return
    if (code.length > 3 || !/^[A-Z0-9]+$/.test(code)) { toast.error('Code must be 1-3 uppercase letters/digits'); return }
    if (items.some((p) => p.code === code)) { toast.error('Code already exists'); return }
    setItems([...items, { code, label: newLabel.trim() }])
    setNewCode('')
    setNewLabel('')
  }

  const removePosition = (code: string) => {
    if (items.length <= 1) { toast.error('Must have at least one position'); return }
    setMigrateFrom(code)
    setShowMigrate(true)
  }

  const confirmRemove = () => {
    if (migrateTo) {
      migrate.mutate()
    }
    setItems(items.filter((p) => p.code !== migrateFrom))
    setShowMigrate(false)
    setMigrateFrom('')
    setMigrateTo('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage Shelf Positions" size="md">
      <div className="space-y-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Positions define where a shelf sits (e.g. Left, Middle, Right). Codes are used in barcode labels (1-3 characters).
        </p>

        <div className="space-y-2">
          {items.map((p) => (
            <div key={p.code} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-300">{p.code}</span>
                <span className="text-sm text-gray-900 dark:text-white">{p.label}</span>
              </div>
              {items.length > 1 && (
                <button onClick={() => removePosition(p.code)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add new */}
        <div className="flex gap-2">
          <Input placeholder="Code (e.g. T)" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase().slice(0, 3))} className="w-20" />
          <Input placeholder="Label (e.g. Top)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="flex-1" />
          <Button variant="secondary" size="sm" onClick={addPosition} disabled={!newCode || !newLabel}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Migration prompt */}
        {showMigrate && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/20">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Migrate shelves from position "{migrateFrom}"?
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              Shelves using this position will have their labels regenerated. Choose a target position or skip to just remove without migrating.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <select value={migrateTo} onChange={(e) => setMigrateTo(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                <option value="">Skip migration</option>
                {items.filter((p) => p.code !== migrateFrom).map((p) => (
                  <option key={p.code} value={p.code}>Migrate to {p.label} ({p.code})</option>
                ))}
              </select>
              <Button size="sm" onClick={confirmRemove} loading={migrate.isPending}>
                {migrateTo ? 'Migrate & Remove' : 'Just Remove'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setShowMigrate(false); setMigrateFrom(''); setMigrateTo('') }}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save Positions</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Create Shelf Modal ──────────────────────────────────────────────────────

function CreateShelfModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const positions = usePositions()
  const [form, setForm] = useState({ code: '', libraryId: '', genre: 'FICTION', position: 'L', location: '', capacity: '100' })

  const { data: libraries } = useQuery({ queryKey: ['libraries', 'all'], queryFn: () => librariesApi.list({ limit: 100 }), enabled: open })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, enabled: open })

  const create = useMutation({
    mutationFn: () => shelvesApi.create({
      code: form.code, libraryId: form.libraryId, genre: form.genre, position: form.position,
      location: form.location || undefined, capacity: parseInt(form.capacity, 10) || 100,
    }),
    onSuccess: () => { toast.success('Shelf created'); qc.invalidateQueries({ queryKey: ['shelves'] }); onClose(); setForm({ code: '', libraryId: '', genre: 'FICTION', position: 'L', location: '', capacity: '100' }) },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Create Shelf">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Shelf code" placeholder="e.g. FIC-01" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
            <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
              {positions.map((p) => <option key={p.code} value={p.code}>{p.label} ({p.code})</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Library</label>
          <select value={form.libraryId} onChange={(e) => setForm({ ...form, libraryId: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            <option value="">Select library…</option>
            {libraries?.data.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.labelPrefix})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
            <select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
              {(categories ?? []).map((c) => <option key={c.name} value={c.name}>{c.label}</option>)}
            </select>
          </div>
          <Input label="Capacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        </div>
        <Input label="Location (optional)" placeholder="e.g. Ground floor, north wing, row 3" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!form.code || !form.libraryId}>Create Shelf</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Edit Shelf Drawer ───────────────────────────────────────────────────────

function EditShelfDrawer({ shelf, onClose }: { shelf: Shelf; onClose: () => void }) {
  const qc = useQueryClient()
  const positions = usePositions()
  const [tab, setTab] = useState<'details' | 'books' | 'copies'>('details')
  const [form, setForm] = useState({
    code: shelf.code, position: shelf.position, genre: shelf.genre,
    location: shelf.location ?? '', capacity: String(shelf.capacity),
  })

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const { data: booksData } = useQuery({
    queryKey: ['books', 'shelf', shelf.id],
    queryFn: () => booksApi.list({ shelfId: shelf.id, limit: 50 }),
    enabled: tab === 'books',
  })

  const { data: copiesData } = useQuery({
    queryKey: ['copies', 'shelf', shelf.id],
    queryFn: () => copiesApi.list({ shelfId: shelf.id, limit: 100 }),
    enabled: tab === 'copies',
  })

  const update = useMutation({
    mutationFn: () => shelvesApi.update(shelf.id, { ...form, capacity: parseInt(form.capacity, 10) || shelf.capacity, location: form.location || undefined } as any),
    onSuccess: () => { toast.success('Shelf updated'); qc.invalidateQueries({ queryKey: ['shelves'] }); onClose() },
    onError: (err) => toast.error(extractError(err)),
  })

  const remove = useMutation({
    mutationFn: () => shelvesApi.remove(shelf.id),
    onSuccess: () => { toast.success('Shelf deleted'); qc.invalidateQueries({ queryKey: ['shelves'] }); onClose() },
    onError: (err) => toast.error(extractError(err)),
  })

  const tabs = ['details', 'books', 'copies'] as const

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{shelf.code}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{shelf.library.name} · {shelf.label}</p>
          </div>
          <button onClick={onClose} className="ml-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors ${tab === t
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'details' && (
            <div className="space-y-4">
              <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
                  <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value as any })}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    {positions.map((p) => <option key={p.code} value={p.code}>{p.label} ({p.code})</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                  <select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value as any })}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    {(categories ?? []).map((c) => <option key={c.name} value={c.name}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <Input label="Capacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              <Input label="Location" placeholder="e.g. Ground floor, north wing" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <Button onClick={() => update.mutate()} loading={update.isPending}>Save changes</Button>

              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="text-xs text-gray-400 dark:text-gray-500">Label: <span className="font-mono">{shelf.label}</span></p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Copies: {shelf._count?.bookCopies ?? 0}</p>
                <div className="mt-2">
                  <img src={`/api/barcodes/shelf/${encodeURIComponent(shelf.label)}`} alt={shelf.label} className="h-10 bg-white p-1 rounded" />
                </div>
              </div>

              <Button variant="secondary" size="sm" onClick={() => {
                const w = window.open('', '_blank', 'width=400,height=300')
                if (!w) return
                w.document.write(`<html><head><title>Print ${shelf.label}</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:monospace}img{max-width:80%}p{margin-top:8px;font-size:14px}</style></head><body><img src="/api/barcodes/shelf/${encodeURIComponent(shelf.label)}" /><p>${shelf.label}</p><script>setTimeout(()=>{window.print();window.close()},500)</script></body></html>`)
                w.document.close()
              }}>
                <Printer className="h-4 w-4" /> Print Label
              </Button>

              <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 dark:text-red-400"
                  onClick={() => { if (confirm(`Delete shelf ${shelf.code}?`)) remove.mutate() }} loading={remove.isPending}>
                  <Trash2 className="h-4 w-4" /> Delete shelf
                </Button>
              </div>
            </div>
          )}

          {tab === 'books' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Books with copies on this shelf.</p>
              {!booksData ? <PageSpinner /> : booksData.data.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center dark:border-gray-700">
                  <BookOpen className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No books on this shelf.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {booksData.data.map((book) => (
                    <Link key={book.id} to={`/books/${book.id}`}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-600 dark:hover:bg-blue-900/20">
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt="" className="h-12 w-8 flex-shrink-0 rounded object-cover" />
                      ) : (
                        <div className="flex h-12 w-8 flex-shrink-0 items-center justify-center rounded bg-gray-100 dark:bg-gray-700">
                          <BookOpen className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1 dark:text-white">{book.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{book.author}</p>
                      </div>
                      {(book as any)._count?.copies != null && (
                        <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {(book as any)._count.copies} {(book as any)._count.copies === 1 ? 'copy' : 'copies'}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'copies' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">All copies on this shelf.</p>
              {!copiesData ? <PageSpinner /> : copiesData.data.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center dark:border-gray-700">
                  <Layers className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No copies on this shelf.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {copiesData.data.map((copy: any) => (
                    <div key={copy.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">{copy.barcode}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{copy.book?.title}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <CopyStatusBadge status={copy.status} />
                        <PrintButton type="copy" code={copy.barcode} libraryId={shelf.library.id} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function ManageShelvesPage() {
  const [params, setParams] = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)
  const [positionsOpen, setPositionsOpen] = useState(false)
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null)
  const positions = usePositions()

  const page = Number(params.get('page') ?? 1)
  const search = params.get('search') ?? ''
  const libraryId = params.get('library') ?? ''
  const genre = params.get('genre') ?? ''

  const { data, isLoading } = useQuery({
    queryKey: ['shelves', { page, libraryId, genre }],
    queryFn: () => shelvesApi.list({ page, limit: 20, libraryId: libraryId || undefined, genre: genre || undefined }),
  })

  const { data: libraries } = useQuery({ queryKey: ['libraries', 'all'], queryFn: () => librariesApi.list({ limit: 100 }) })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    next.delete('page')
    setParams(next)
  }

  const filteredShelves = (data?.data ?? []).filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.code.toLowerCase().includes(q) || s.label.toLowerCase().includes(q) || (s.location ?? '').toLowerCase().includes(q)
  })

  const posLabel = (code: string) => positions.find((p) => p.code === code)?.label ?? code

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shelves</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage shelving across all libraries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPositionsOpen(true)}>
            <Settings2 className="h-4 w-4" /> Positions
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Shelf
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Search code, label, location…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500" />
        </div>
        <select value={libraryId} onChange={(e) => setFilter('library', e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
          <option value="">All libraries</option>
          {libraries?.data.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={genre} onChange={(e) => setFilter('genre', e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
          <option value="">All categories</option>
          {(categories ?? []).map((c) => <option key={c.name} value={c.name}>{c.label}</option>)}
        </select>
      </div>

      {isLoading ? <PageSpinner /> : filteredShelves.length === 0 ? (
        <EmptyState icon={Layers} title="No shelves found" description="Create a shelf to start organising books." />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Library</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Position</th>
                  <th className="px-4 py-3 text-left">Location</th>
                  <th className="px-4 py-3 text-right">Copies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredShelves.map((shelf) => (
                  <tr key={shelf.id} onClick={() => setSelectedShelf(shelf)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3">
                      <p className="font-mono font-medium text-gray-900 dark:text-white">{shelf.code}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{shelf.label}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{shelf.library.name}</td>
                    <td className="px-4 py-3"><Badge label={shelf.genre.replace('_', ' ')} variant="blue" /></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{posLabel(shelf.position)}</td>
                    <td className="px-4 py-3">
                      {shelf.location ? (
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"><MapPin className="h-3 w-3" /> {shelf.location}</span>
                      ) : <span className="text-xs text-gray-400 dark:text-gray-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{shelf._count?.bookCopies ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && data.meta.totalPages > 1 && (
            <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} limit={data.meta.limit}
              onPage={(p) => { const n = new URLSearchParams(params); n.set('page', String(p)); setParams(n) }} />
          )}
        </>
      )}

      <CreateShelfModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ManagePositionsModal open={positionsOpen} onClose={() => setPositionsOpen(false)} />
      {selectedShelf && <EditShelfDrawer shelf={selectedShelf} onClose={() => setSelectedShelf(null)} />}
    </div>
  )
}
