import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { startAuthentication } from '@simplewebauthn/browser'
import { ArrowLeft, Database, Plus, Download, RotateCcw, Trash2, Clock, Shield, HardDrive } from 'lucide-react'
import { backupsApi, type Backup } from '../../api/backups'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { extractError } from '../../api/client'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function reasonBadge(reason: Backup['reason']) {
  switch (reason) {
    case 'scheduled': return <Badge label="Scheduled" variant="blue" />
    case 'pre-delete': return <Badge label="Pre-delete" variant="yellow" />
    case 'manual': return <Badge label="Manual" variant="gray" />
  }
}

export default function BackupsPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [restoring, setRestoring] = useState<Backup | null>(null)
  const [deleting, setDeleting] = useState<Backup | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: backupsApi.list,
  })

  void qc // used in modals

  const backups = data?.backups ?? []

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/admin" className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Admin
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/40">
            <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Backups</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Database backups — automatic daily at 2 AM, plus manual and pre-delete</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create Backup
        </Button>
      </div>

      {isLoading ? <PageSpinner /> : backups.length === 0 ? (
        <EmptyState icon={Database} title="No backups yet" description="Create your first backup or wait for the daily automatic backup at 2 AM." />
      ) : (
        <div className="space-y-3">
          {backups.map((backup) => (
            <div key={backup.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{backup.label}</p>
                  {reasonBadge(backup.reason)}
                </div>
                <p className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">{backup.filename}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(backup.createdAt).toLocaleString()}</span>
                  <span>{formatSize(backup.size)}</span>
                  {backup.note && <span>· {backup.note}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => backupsApi.download(backup.id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300" title="Download">
                  <Download className="h-4 w-4" />
                </button>
                <button onClick={() => setRestoring(backup)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400" title="Restore">
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleting(backup)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateBackupModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {restoring && <RestoreModal backup={restoring} onClose={() => setRestoring(null)} />}
      {deleting && <DeleteBackupModal backup={deleting} onClose={() => setDeleting(null)} />}
    </div>
  )
}

// ── Create Backup Modal ──────────────────────────────────────────────────────

function CreateBackupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')

  const create = useMutation({
    mutationFn: () => backupsApi.create(note || undefined),
    onSuccess: () => {
      toast.success('Backup created')
      qc.invalidateQueries({ queryKey: ['backups'] })
      setNote('')
      onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Create Backup">
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Create a snapshot of the current database. This can be restored later.
        </p>
        <Input label="Note (optional)" placeholder="e.g. Before major changes" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} loading={create.isPending}>Create Backup</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Restore Modal ────────────────────────────────────────────────────────────

function RestoreModal({ backup, onClose }: { backup: Backup; onClose: () => void }) {
  const [phase, setPhase] = useState<'confirm' | 'challenge' | 'verify'>('confirm')
  const [method, setMethod] = useState<'security-key' | 'console-code' | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [webauthnOptions, setWebauthnOptions] = useState<any>(null)

  const startRestore = async () => {
    setLoading(true)
    try {
      const result = await backupsApi.restoreChallenge(backup.id)
      setMethod(result.method)
      if (result.method === 'security-key' && result.options) {
        setWebauthnOptions(result.options)
      }
      setPhase('verify')
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  const verifySecurityKey = async () => {
    if (!webauthnOptions) return
    setLoading(true)
    try {
      const credential = await startAuthentication({ optionsJSON: webauthnOptions })
      const result = await backupsApi.restoreVerify(backup.id, { credential })
      toast.success(result.message)
      onClose()
      // Force reload after restore
      setTimeout(() => { window.location.href = '/login' }, 1500)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async () => {
    if (!code.trim()) return
    setLoading(true)
    try {
      const result = await backupsApi.restoreVerify(backup.id, { code })
      toast.success(result.message)
      onClose()
      setTimeout(() => { window.location.href = '/login' }, 1500)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Restore Backup">
      <div className="space-y-4">
        {phase === 'confirm' && (
          <>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/20">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">This will replace all current data</p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                A backup of the current database will be created automatically before restoring.
                After restore, you will need to re-login.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400">Restoring from:</p>
              <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">{backup.filename}</p>
              <p className="text-xs text-gray-400">{new Date(backup.createdAt).toLocaleString()} · {formatSize(backup.size)}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="danger" onClick={startRestore} loading={loading}>
                <Shield className="h-4 w-4" /> Continue to Verification
              </Button>
            </div>
          </>
        )}

        {phase === 'verify' && method === 'security-key' && (
          <>
            <div className="text-center py-4">
              <Shield className="mx-auto mb-3 h-12 w-12 text-blue-500" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Touch your security key</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Verify your identity to confirm the restore
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={verifySecurityKey} loading={loading}>
                <Shield className="h-4 w-4" /> Verify & Restore
              </Button>
            </div>
          </>
        )}

        {phase === 'verify' && method === 'console-code' && (
          <>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700/50 dark:bg-blue-900/20">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Check the server logs</p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                A 6-digit confirmation code has been printed in the Docker Compose logs.
                Run <code className="rounded bg-blue-100 px-1 dark:bg-blue-800">docker-compose logs -f api</code> to view it.
              </p>
            </div>
            <Input label="Confirmation Code" placeholder="Enter 6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="danger" onClick={verifyCode} loading={loading} disabled={code.length < 6}>
                Verify & Restore
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ── Delete Backup Modal (requires verification) ──────────────────────────────

function DeleteBackupModal({ backup, onClose }: { backup: Backup; onClose: () => void }) {
  const qc = useQueryClient()
  const [phase, setPhase] = useState<'confirm' | 'verify'>('confirm')
  const [method, setMethod] = useState<'security-key' | 'console-code' | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [webauthnOptions, setWebauthnOptions] = useState<any>(null)

  const startDelete = async () => {
    setLoading(true)
    try {
      const result = await backupsApi.deleteChallenge(backup.id)
      setMethod(result.method)
      if (result.method === 'security-key' && result.options) setWebauthnOptions(result.options)
      setPhase('verify')
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  const verifyAndDelete = async (data: { credential?: any; code?: string }) => {
    setLoading(true)
    try {
      await backupsApi.deleteVerify(backup.id, data)
      toast.success('Backup deleted')
      qc.invalidateQueries({ queryKey: ['backups'] })
      onClose()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  const verifySecurityKey = async () => {
    if (!webauthnOptions) return
    try {
      const credential = await startAuthentication({ optionsJSON: webauthnOptions })
      await verifyAndDelete({ credential })
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  return (
    <Modal open onClose={onClose} title="Delete Backup">
      <div className="space-y-4">
        {phase === 'confirm' && (
          <>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-700/50 dark:bg-red-900/20">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">This will permanently delete this backup</p>
              <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                You will need to verify your identity to proceed.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{backup.label}</p>
              <p className="font-mono text-xs text-gray-400">{backup.filename}</p>
              <p className="text-xs text-gray-400">{new Date(backup.createdAt).toLocaleString()} · {formatSize(backup.size)}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="danger" onClick={startDelete} loading={loading}>
                <Shield className="h-4 w-4" /> Continue to Verification
              </Button>
            </div>
          </>
        )}

        {phase === 'verify' && method === 'security-key' && (
          <>
            <div className="text-center py-4">
              <Shield className="mx-auto mb-3 h-12 w-12 text-red-500" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Touch your security key</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Verify to delete this backup</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="danger" onClick={verifySecurityKey} loading={loading}>
                <Shield className="h-4 w-4" /> Verify & Delete
              </Button>
            </div>
          </>
        )}

        {phase === 'verify' && method === 'console-code' && (
          <>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700/50 dark:bg-blue-900/20">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Check the server logs</p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                Run <code className="rounded bg-blue-100 px-1 dark:bg-blue-800">docker-compose logs -f api</code> to view the code.
              </p>
            </div>
            <Input label="Confirmation Code" placeholder="Enter 6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="danger" onClick={() => verifyAndDelete({ code })} loading={loading} disabled={code.length < 6}>
                Verify & Delete
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
