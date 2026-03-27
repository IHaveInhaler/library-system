import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Library, Plus } from 'lucide-react'
import { librariesApi } from '../../api/libraries'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { extractError } from '../../api/client'

export default function ManageLibrariesPage() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', labelPrefix: '', email: '', isPrivate: false })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['libraries'],
    queryFn: () => librariesApi.list({ limit: 50 }),
  })

  const create = useMutation({
    mutationFn: () => librariesApi.create({ name: form.name, labelPrefix: form.labelPrefix, email: form.email || undefined, isPrivate: form.isPrivate }),
    onSuccess: () => { toast.success('Library created'); setOpen(false); setForm({ name: '', labelPrefix: '', email: '', isPrivate: false }); qc.invalidateQueries({ queryKey: ['libraries'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Libraries</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Library</Button>
      </div>

      {isLoading ? <PageSpinner /> : !data?.data.length ? (
        <EmptyState icon={Library} title="No libraries yet" action={<Button onClick={() => setOpen(true)}>Add first library</Button>} />
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.data.map((lib) => (
                <tr key={lib.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{lib.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{lib.labelPrefix}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{lib.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${lib.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                      {lib.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${lib.isPrivate ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {lib.isPrivate ? 'Private' : 'Public'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Library">
        <div className="space-y-4">
          <Input label="Library Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Central City Library" />
          <Input label="Label Prefix (3 letters)" value={form.labelPrefix} onChange={(e) => setForm({ ...form, labelPrefix: e.target.value.toUpperCase().slice(0, 3) })} placeholder="e.g. CEN" maxLength={3} />
          <Input label="Email (optional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={form.isPrivate} onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
            Private library (members-only access)
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} loading={create.isPending}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
