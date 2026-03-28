import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, FileImage, Trash2, Search, User, BookOpen, Library, HelpCircle, HardDrive } from 'lucide-react'
import { api, extractError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'

interface FileEntry {
  id: string
  filename: string
  url: string
  type: 'avatar' | 'library-image' | 'book-cover' | 'orphan'
  size: number
  owner: { id: string; name: string } | null
  entity: { id: string; name: string } | null
  createdAt: string | null
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const typeConfig = {
  'avatar': { label: 'Avatar', variant: 'purple' as const, icon: User },
  'library-image': { label: 'Library', variant: 'blue' as const, icon: Library },
  'book-cover': { label: 'Book Cover', variant: 'green' as const, icon: BookOpen },
  'orphan': { label: 'Orphan', variant: 'red' as const, icon: HelpCircle },
}

export default function FilesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-files'],
    queryFn: () => api.get<{ files: FileEntry[]; totalSize: number }>('/files').then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => api.delete(`/files/${fileId}`),
    onSuccess: () => { toast.success('File deleted'); qc.invalidateQueries({ queryKey: ['admin-files'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  const deleteOrphansMutation = useMutation({
    mutationFn: () => api.delete('/files/orphans'),
    onSuccess: (res: any) => { toast.success(res.data.message || 'Orphans deleted'); qc.invalidateQueries({ queryKey: ['admin-files'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  const orphanCount = (data?.files ?? []).filter((f) => f.type === 'orphan').length

  const q = search.toLowerCase()
  const filtered = (data?.files ?? []).filter((f) => {
    if (typeFilter && f.type !== typeFilter) return false
    if (!q) return true
    return f.filename.toLowerCase().includes(q)
      || f.owner?.name.toLowerCase().includes(q)
      || f.entity?.name.toLowerCase().includes(q)
      || f.type.toLowerCase().includes(q)
  })

  const types = ['avatar', 'library-image', 'book-cover', 'orphan'] as const

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/admin" className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Admin
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-violet-100 p-2.5 dark:bg-violet-900/40">
            <FileImage className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Files</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data ? `${data.files.length} files · ${formatSize(data.totalSize)} total` : 'Manage uploaded files'}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename, user, book, library…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">All types</option>
          {types.map((t) => <option key={t} value={t}>{typeConfig[t].label}</option>)}
        </select>
        {orphanCount > 0 && (
          <Button variant="danger" size="sm" loading={deleteOrphansMutation.isPending}
            onClick={() => { if (confirm(`Delete all ${orphanCount} orphan files?`)) deleteOrphansMutation.mutate() }}>
            <Trash2 className="h-4 w-4" /> Delete {orphanCount} orphan{orphanCount !== 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {isLoading ? <PageSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={HardDrive} title="No files found" description={search || typeFilter ? 'Try a different search or filter.' : 'No uploaded files yet.'} />
      ) : (
        <div className="space-y-2">
          {filtered.map((file) => {
            const config = typeConfig[file.type]
            const Icon = config.icon
            return (
              <div key={file.id} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  {file.type !== 'orphan' ? (
                    <img src={file.url} alt="" className="h-12 w-12 rounded-lg object-cover bg-gray-100 dark:bg-gray-700" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                      <HelpCircle className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.entity?.name || file.filename}
                    </p>
                    <Badge label={config.label} variant={config.variant} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-mono">{file.filename}</span>
                    <span>·</span>
                    <span>{formatSize(file.size)}</span>
                    {file.owner && <><span>·</span><span>{file.owner.name}</span></>}
                    {file.createdAt && <><span>·</span><span>{new Date(file.createdAt).toLocaleDateString()}</span></>}
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => { if (confirm(`Delete ${file.filename}?`)) deleteMutation.mutate(file.id) }}
                  disabled={deleteMutation.isPending}
                  className="flex-shrink-0 rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                  title="Delete file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
