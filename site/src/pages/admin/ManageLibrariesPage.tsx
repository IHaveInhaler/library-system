import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Library, Plus, X, Pencil, Trash2, Upload, ImageIcon, Printer } from 'lucide-react'
import { librariesApi } from '../../api/libraries'
import { uploadsApi } from '../../api/uploads'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { extractError } from '../../api/client'
import type { Library as LibraryType } from '../../types'

// ── Add Library Modal ─────────────────────────────────────────────────────────
function AddLibraryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', labelPrefix: '', email: '', isPrivate: false })

  const create = useMutation({
    mutationFn: () => librariesApi.create({
      name: form.name,
      labelPrefix: form.labelPrefix,
      email: form.email || undefined,
      isPrivate: form.isPrivate,
    }),
    onSuccess: () => {
      toast.success('Library created')
      qc.invalidateQueries({ queryKey: ['libraries'] })
      onClose()
      setForm({ name: '', labelPrefix: '', email: '', isPrivate: false })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Add Library">
      <div className="space-y-4">
        <Input label="Library Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Central City Library" />
        <Input label="Label Prefix (3 letters)" value={form.labelPrefix}
          onChange={(e) => setForm({ ...form, labelPrefix: e.target.value.toUpperCase().slice(0, 3) })}
          placeholder="e.g. CEN" maxLength={3} />
        <Input label="Email (optional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={form.isPrivate} onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
          Private library (members-only access)
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!form.name || !form.labelPrefix}>Create</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Delete Library Modal ──────────────────────────────────────────────────────
function DeleteLibraryModal({ library, open, onClose }: { library: LibraryType; open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [action, setAction] = useState<'deactivate' | 'move' | 'delete'>('deactivate')
  const [targetLibraryId, setTargetLibraryId] = useState('')

  const { data: allLibraries } = useQuery({
    queryKey: ['libraries', 'all-for-move'],
    queryFn: () => librariesApi.list({ limit: 100 }),
    enabled: open,
  })
  const otherLibraries = allLibraries?.data.filter((l) => l.id !== library.id) ?? []

  const deleteMutation = useMutation({
    mutationFn: () => librariesApi.remove(library.id, {
      action: action === 'deactivate' ? undefined : action,
      targetLibraryId: action === 'move' ? targetLibraryId : undefined,
    }),
    onSuccess: () => {
      toast.success(
        action === 'deactivate' ? 'Library deactivated' :
        action === 'move' ? 'Library deleted and shelves moved' :
        'Library and all contents deleted'
      )
      qc.invalidateQueries({ queryKey: ['libraries'] })
      onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Delete Library" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose what to do with <span className="font-semibold text-gray-900 dark:text-white">{library.name}</span>:
        </p>

        <div className="space-y-2">
          {[
            { value: 'deactivate', label: 'Deactivate only', desc: 'Hide the library but keep all data. Can be reactivated.' },
            { value: 'move', label: 'Delete and move shelves', desc: 'Move all shelves (and books) to another library, then delete this one.' },
            { value: 'delete', label: 'Delete everything', desc: 'Permanently delete the library, all shelves, copies, loans and reservations.' },
          ].map((opt) => (
            <label key={opt.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${action === opt.value ? 'border-blue-500 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
              <input type="radio" name="deleteAction" value={opt.value} checked={action === opt.value as any}
                onChange={() => setAction(opt.value as any)} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {action === 'move' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Target library</label>
            <select
              value={targetLibraryId}
              onChange={(e) => setTargetLibraryId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select library…</option>
              {otherLibraries.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            {otherLibraries.length === 0 && (
              <p className="mt-1 text-xs text-red-500">No other libraries available to move shelves to.</p>
            )}
          </div>
        )}

        {action === 'delete' && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-700/50 dark:bg-red-900/20">
            <p className="text-xs text-red-700 dark:text-red-400 font-medium">This is irreversible. All shelves, book copies, loans and reservations in this library will be permanently deleted.</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant={action === 'delete' ? 'danger' : 'secondary'}
            onClick={() => deleteMutation.mutate()}
            loading={deleteMutation.isPending}
            disabled={action === 'move' && !targetLibraryId}
          >
            {action === 'deactivate' ? 'Deactivate' : action === 'move' ? 'Move & Delete' : 'Delete Everything'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Edit Library Drawer ───────────────────────────────────────────────────────
function EditLibraryDrawer({ library, onClose }: { library: LibraryType; onClose: () => void }) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: library.name,
    labelPrefix: library.labelPrefix,
    email: library.email ?? '',
    isPrivate: library.isPrivate,
    isActive: library.isActive,
    printMethod: (library as any).printMethod ?? '',
    printZplHost: (library as any).printZplHost ?? '',
    printZplPort: (library as any).printZplPort ?? '9100',
    printZplLabelWidth: (library as any).printZplLabelWidth ?? '50',
    printZplLabelHeight: (library as any).printZplLabelHeight ?? '25',
    printIppUrl: (library as any).printIppUrl ?? '',
  })
  const [deleteOpen, setDeleteOpen] = useState(false)

  const update = useMutation({
    mutationFn: () => librariesApi.update(library.id, {
      name: form.name,
      labelPrefix: form.labelPrefix || undefined,
      email: form.email || undefined,
      isPrivate: form.isPrivate,
      isActive: form.isActive,
      printMethod: form.printMethod || null,
      printZplHost: form.printZplHost || null,
      printZplPort: form.printZplPort || null,
      printZplLabelWidth: form.printZplLabelWidth || null,
      printZplLabelHeight: form.printZplLabelHeight || null,
      printIppUrl: form.printIppUrl || null,
    }),
    onSuccess: () => {
      toast.success('Library updated')
      qc.invalidateQueries({ queryKey: ['libraries'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const uploadImage = useMutation({
    mutationFn: (file: File) => uploadsApi.uploadLibraryImage(library.id, file),
    onSuccess: () => {
      toast.success('Image uploaded')
      qc.invalidateQueries({ queryKey: ['libraries'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const deleteImage = useMutation({
    mutationFn: () => uploadsApi.deleteLibraryImage(library.id),
    onSuccess: () => {
      toast.success('Image removed')
      qc.invalidateQueries({ queryKey: ['libraries'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadImage.mutate(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const prefixChanged = form.labelPrefix !== library.labelPrefix

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                <Library className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{library.name}</p>
                <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{library.labelPrefix}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Library Image */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Library Image</label>
              {library.imageUrl ? (
                <div className="relative">
                  <img
                    src={library.imageUrl}
                    alt={library.name}
                    className="h-36 w-full rounded-xl object-cover border border-gray-200 dark:border-gray-700"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      loading={uploadImage.isPending}
                    >
                      <Upload className="h-3.5 w-3.5" /> Replace
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteImage.mutate()}
                      loading={deleteImage.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadImage.isPending}
                  className="flex h-36 w-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 transition hover:border-blue-400 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
                >
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {uploadImage.isPending ? 'Uploading...' : 'Click to upload an image'}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">Recommended: 1200×400px</p>
                  </div>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <Input label="Library Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div>
              <Input
                label="Label Prefix (3 letters)"
                value={form.labelPrefix}
                onChange={(e) => setForm({ ...form, labelPrefix: e.target.value.toUpperCase().slice(0, 3) })}
                maxLength={3}
              />
              {prefixChanged && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Changing the prefix will regenerate labels for all shelves in this library.
                </p>
              )}
            </div>
            <Input label="Email (optional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.isPrivate} onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                Private library
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                Active
              </label>
            </div>

            {/* Printer Settings */}
            <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
              <div className="mb-3 flex items-center gap-2">
                <Printer className="h-4 w-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Printer</p>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Print Method</label>
                  <select value={form.printMethod} onChange={(e) => setForm({ ...form, printMethod: e.target.value })}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option value="">Use global default</option>
                    <option value="browser">Browser Print Dialog</option>
                    <option value="zpl">ZPL (Zebra Thermal)</option>
                    <option value="ipp">IPP (Network Printer)</option>
                  </select>
                </div>

                {form.printMethod === 'zpl' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Input label="Printer IP" placeholder="192.168.1.50" value={form.printZplHost} onChange={(e) => setForm({ ...form, printZplHost: e.target.value })} />
                      <Input label="Port" placeholder="9100" value={form.printZplPort} onChange={(e) => setForm({ ...form, printZplPort: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input label="Label W (mm)" placeholder="50" value={form.printZplLabelWidth} onChange={(e) => setForm({ ...form, printZplLabelWidth: e.target.value })} />
                      <Input label="Label H (mm)" placeholder="25" value={form.printZplLabelHeight} onChange={(e) => setForm({ ...form, printZplLabelHeight: e.target.value })} />
                    </div>
                  </>
                )}

                {form.printMethod === 'ipp' && (
                  <Input label="Printer URL" placeholder="http://192.168.1.50:631/ipp/print" value={form.printIppUrl} onChange={(e) => setForm({ ...form, printIppUrl: e.target.value })} />
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={() => update.mutate()} loading={update.isPending}>Save changes</Button>
            </div>

            <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete Library
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DeleteLibraryModal library={library} open={deleteOpen} onClose={() => { setDeleteOpen(false); onClose() }} />
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ManageLibrariesPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<LibraryType | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['libraries'],
    queryFn: () => librariesApi.list({ limit: 50 }),
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Libraries</h1>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Library</Button>
      </div>

      {isLoading ? <PageSpinner /> : !data?.data.length ? (
        <EmptyState icon={Library} title="No libraries yet" action={<Button onClick={() => setAddOpen(true)}>Add first library</Button>} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Prefix</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Access</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.data.map((lib) => (
                <tr key={lib.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{lib.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{lib.labelPrefix}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{lib.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge label={lib.isActive ? 'Active' : 'Inactive'} variant={lib.isActive ? 'green' : 'gray'} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={lib.isPrivate ? 'Private' : 'Public'} variant={lib.isPrivate ? 'yellow' : 'gray'} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(lib)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddLibraryModal open={addOpen} onClose={() => setAddOpen(false)} />
      {editing && <EditLibraryDrawer library={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
