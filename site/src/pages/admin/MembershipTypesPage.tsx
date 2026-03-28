import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Shield, Clock, Pencil, Check, X, GripVertical } from 'lucide-react'
import { membershipTypesApi, type MembershipType } from '../../api/membershipTypes'
import { PageSpinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { extractError } from '../../api/client'

// ── Create Modal ────────────────────────────────────────────────────────────

function CreateModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [durationDays, setDurationDays] = useState('')
  const [isStaff, setIsStaff] = useState(false)
  const [nameError, setNameError] = useState('')

  const create = useMutation({
    mutationFn: () =>
      membershipTypesApi.create({
        name,
        label,
        durationDays: durationDays ? parseInt(durationDays, 10) : null,
        isStaff,
      }),
    onSuccess: () => {
      toast.success(`Type "${label}" created`)
      onSuccess()
      handleClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const handleClose = () => {
    setName('')
    setLabel('')
    setDurationDays('')
    setIsStaff(false)
    setNameError('')
    onClose()
  }

  const validateName = (v: string) => {
    if (!/^[A-Z][A-Z0-9_]*$/.test(v)) setNameError('Uppercase letters, digits, underscores — starts with letter')
    else setNameError('')
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create Membership Type">
      <div className="space-y-4">
        <Input
          label="Name (machine key)"
          placeholder="e.g. WEEKLY"
          value={name}
          onChange={(e) => { setName(e.target.value.toUpperCase()); validateName(e.target.value.toUpperCase()) }}
          error={nameError}
        />
        <Input
          label="Display label"
          placeholder="e.g. Weekly"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Input
          label="Duration (days)"
          type="number"
          placeholder="Leave empty for no auto-expiry"
          value={durationDays}
          onChange={(e) => setDurationDays(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={isStaff}
            onChange={(e) => setIsStaff(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Staff access
          <span className="text-xs text-gray-400 dark:text-gray-500">(grants library management)</span>
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!name || !label || !!nameError}>
            Create
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Type Card ───────────────────────────────────────────────────────────────

function TypeCard({ type, onDelete }: { type: MembershipType; onDelete: (id: string) => void }) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState(type.label)
  const [editingDuration, setEditingDuration] = useState(false)
  const [durationDraft, setDurationDraft] = useState(type.durationDays?.toString() ?? '')
  const qc = useQueryClient()

  const updateLabel = useMutation({
    mutationFn: () => membershipTypesApi.update(type.id, { label: labelDraft }),
    onSuccess: () => { toast.success('Label updated'); setEditingLabel(false); qc.invalidateQueries({ queryKey: ['membership-types'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  const updateDuration = useMutation({
    mutationFn: () => membershipTypesApi.update(type.id, { durationDays: durationDraft ? parseInt(durationDraft, 10) : null }),
    onSuccess: () => { toast.success('Duration updated'); setEditingDuration(false); qc.invalidateQueries({ queryKey: ['membership-types'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  const durationText = type.durationDays
    ? type.durationDays === 1 ? '1 day' : `${type.durationDays} days`
    : 'No expiry'

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex cursor-grab items-center text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 active:cursor-grabbing">
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
          {type.isStaff ? (
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {editingLabel ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') updateLabel.mutate(); if (e.key === 'Escape') setEditingLabel(false) }}
                  className="rounded border border-gray-300 bg-white px-2 py-0.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <button onClick={() => updateLabel.mutate()} className="rounded p-0.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"><Check className="h-3.5 w-3.5" /></button>
                <button onClick={() => { setEditingLabel(false); setLabelDraft(type.label) }} className="rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-gray-900 dark:text-white">{type.label}</p>
                {!type.isBuiltIn && (
                  <button onClick={() => setEditingLabel(true)} className="rounded p-0.5 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400">
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-mono">{type.name}</span>
            <span>·</span>
            {editingDuration ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  type="number"
                  value={durationDraft}
                  onChange={(e) => setDurationDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') updateDuration.mutate(); if (e.key === 'Escape') setEditingDuration(false) }}
                  placeholder="∞"
                  className="w-16 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <span className="text-xs">days</span>
                <button onClick={() => updateDuration.mutate()} className="rounded p-0.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"><Check className="h-3 w-3" /></button>
                <button onClick={() => { setEditingDuration(false); setDurationDraft(type.durationDays?.toString() ?? '') }} className="rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-3 w-3" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span>{durationText}</span>
                {!type.isBuiltIn && (
                  <button onClick={() => setEditingDuration(true)} className="rounded p-0.5 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400">
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
            {type.isStaff && (
              <>
                <span>·</span>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">Staff</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {type.isBuiltIn && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">built-in</span>
          )}
          {!type.isBuiltIn && (
            <button
              onClick={() => onDelete(type.id)}
              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function MembershipTypesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const qc = useQueryClient()

  const { data: types, isLoading } = useQuery({
    queryKey: ['membership-types'],
    queryFn: membershipTypesApi.list,
  })

  const deleteType = useMutation({
    mutationFn: membershipTypesApi.remove,
    onSuccess: () => { toast.success('Type deleted'); qc.invalidateQueries({ queryKey: ['membership-types'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/admin" className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Admin
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Membership Types</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Define the types of library memberships. Staff types grant management access.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Type
        </Button>
      </div>

      <div className="space-y-3">
        {(types ?? []).map((t) => (
          <TypeCard key={t.id} type={t} onDelete={(id) => deleteType.mutate(id)} />
        ))}
      </div>

      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['membership-types'] })}
      />
    </div>
  )
}
