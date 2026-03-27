import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Users2, Plus, Trash2, Lock, ShieldCheck, Pencil, Check, X, GripVertical } from 'lucide-react'
import { groupsApi, type Group } from '../../api/groups'
import { permissionsApi } from '../../api/permissions'
import { PageSpinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { extractError } from '../../api/client'

const PERMISSION_LABELS: Record<string, string> = {
  VIEW_LIBRARIES: 'View Libraries',
  VIEW_ALL_LIBRARIES: 'View All Libraries (bypass membership)',
  MANAGE_BOOKS: 'Manage Books',
  MANAGE_LIBRARIES: 'Manage Libraries',
  MANAGE_SHELVES: 'Manage Shelves',
  MANAGE_COPIES: 'Manage Copies',
  ISSUE_LOANS: 'Issue Loans',
  RETURN_LOANS: 'Return Loans',
  VIEW_ALL_LOANS: 'View All Loans',
  MANAGE_RESERVATIONS: 'Manage Reservations',
  VIEW_ALL_RESERVATIONS: 'View All Reservations',
  MANAGE_MEMBERSHIPS: 'Manage Memberships',
  VIEW_USERS: 'View Users',
  MANAGE_USERS: 'Manage Users',
}

// ── Toggle ─────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
        disabled
          ? 'cursor-not-allowed opacity-50'
          : checked
          ? 'bg-blue-600'
          : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

// ── Create Group Modal ────────────────────────────────────────────────────────

function CreateGroupModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')

  const create = useMutation({
    mutationFn: () => groupsApi.create({ name, description: description || undefined }),
    onSuccess: () => { toast.success(`Group "${name}" created`); onSuccess() },
    onError: (err) => toast.error(extractError(err)),
  })

  const handleClose = () => { setName(''); setDescription(''); setNameError(''); onClose() }

  const validateName = (v: string) => {
    if (!/^[A-Z][A-Z0-9_]*$/.test(v)) {
      setNameError('Uppercase letters, digits, underscores only — must start with a letter')
    } else {
      setNameError('')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create Group">
      <div className="space-y-4">
        <Input
          label="Group name"
          placeholder="e.g. SENIOR_LIBRARIAN"
          value={name}
          onChange={(e) => { setName(e.target.value.toUpperCase()); validateName(e.target.value.toUpperCase()) }}
          error={nameError}
        />
        <Input
          label="Description (optional)"
          placeholder="What this group is for"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          After creation you can assign permissions to this group from the group's permission panel.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={() => create.mutate()}
            loading={create.isPending}
            disabled={!name || !!nameError}
          >
            Create Group
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Group Card ────────────────────────────────────────────────────────────────

function GroupCard({
  group,
  rank,
  onDelete,
  dragHandleProps,
}: {
  group: Group
  rank: number
  onDelete: (name: string) => void
  dragHandleProps: React.HTMLAttributes<HTMLDivElement>
}) {
  const [expanded, setExpanded] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState(group.description ?? '')
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(group.name)
  const [nameError, setNameError] = useState('')
  const qc = useQueryClient()

  const updateDesc = useMutation({
    mutationFn: () => groupsApi.update(group.name, { description: descDraft }),
    onSuccess: () => { toast.success('Description saved'); setEditingDesc(false); qc.invalidateQueries({ queryKey: ['groups'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  const updateName = useMutation({
    mutationFn: () => groupsApi.update(group.name, { name: nameDraft }),
    onSuccess: () => { toast.success('Group renamed'); setEditingName(false); qc.invalidateQueries({ queryKey: ['groups'] }) },
    onError: (err) => { toast.error(extractError(err)) },
  })

  const toggle = useMutation({
    mutationFn: ({ permission, granted }: { permission: string; granted: boolean }) =>
      permissionsApi.set(group.name, permission, granted),
    onMutate: async ({ permission, granted }) => {
      await qc.cancelQueries({ queryKey: ['groups'] })
      const prev = qc.getQueryData(['groups'])
      qc.setQueryData(['groups'], (old: Group[] | undefined) =>
        old?.map((g) =>
          g.name === group.name
            ? { ...g, permissions: { ...g.permissions, [permission]: granted } }
            : g
        )
      )
      return { prev }
    },
    onError: (err, _vars, ctx) => {
      qc.setQueryData(['groups'], ctx?.prev)
      toast.error(extractError(err))
    },
    onSuccess: () => toast.success('Permission updated'),
  })

  const isAdmin = group.name === 'ADMIN'
  const grantedCount = Object.values(group.permissions).filter(Boolean).length
  const totalCount = Object.keys(group.permissions).length

  const validateName = (v: string) => {
    if (!/^[A-Z][A-Z0-9_]*$/.test(v)) {
      setNameError('Uppercase letters, digits, underscores only')
    } else {
      setNameError('')
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2 px-3 py-4">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="flex cursor-grab items-center text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Rank badge */}
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
          {rank}
        </span>

        {/* Main clickable area */}
        <div
          className="flex flex-1 cursor-pointer items-center justify-between gap-3 hover:opacity-80"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
              {isAdmin ? (
                <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <Users2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {/* Name row */}
              {editingName ? (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col gap-0.5">
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => { setNameDraft(e.target.value.toUpperCase()); validateName(e.target.value.toUpperCase()) }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !nameError) updateName.mutate()
                        if (e.key === 'Escape') { setEditingName(false); setNameDraft(group.name) }
                      }}
                      className="rounded border border-gray-300 bg-white px-2 py-0.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                    {nameError && <span className="text-xs text-red-500">{nameError}</span>}
                  </div>
                  <button onClick={() => !nameError && updateName.mutate()} className="rounded p-0.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30" disabled={!!nameError}>
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { setEditingName(false); setNameDraft(group.name); setNameError('') }} className="rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-gray-900 dark:text-white">{group.name}</p>
                  {!group.isBuiltIn && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingName(true) }}
                      className="rounded p-0.5 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Description row */}
              {editingDesc ? (
                <div className="mt-0.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') updateDesc.mutate(); if (e.key === 'Escape') setEditingDesc(false) }}
                    placeholder="Add a description…"
                    className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  <button onClick={() => updateDesc.mutate()} className="rounded p-0.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { setEditingDesc(false); setDescDraft(group.description ?? '') }} className="rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {group.description || (group.isBuiltIn ? 'Built-in group' : 'Custom group')}
                    {' · '}
                    {isAdmin ? 'All permissions' : `${grantedCount} / ${totalCount} permissions`}
                  </p>
                  {!group.isBuiltIn && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingDesc(true) }}
                      className="rounded p-0.5 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {group.isBuiltIn && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                built-in
              </span>
            )}
            {!group.isBuiltIn && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(group.name) }}
                className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                title="Delete group"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-700">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Permissions
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(group.permissions).map(([perm, granted]) => (
              <div key={perm} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {PERMISSION_LABELS[perm] ?? perm}
                </span>
                {isAdmin ? (
                  <div className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-gray-400" />
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                  </div>
                ) : (
                  <Toggle
                    checked={granted}
                    disabled={isAdmin}
                    onChange={(v) => toggle.mutate({ permission: perm, granted: v })}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [orderedGroups, setOrderedGroups] = useState<Group[] | null>(null)
  const qc = useQueryClient()

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: groupsApi.list,
    select: (data) => [...data].sort((a, b) => a.order - b.order),
  })

  // Use local ordered state if dragging, otherwise server state
  const displayGroups = orderedGroups ?? groups ?? []

  const deleteGroup = useMutation({
    mutationFn: groupsApi.remove,
    onSuccess: (_data, name) => {
      toast.success(`Group "${name}" deleted`)
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const reorder = useMutation({
    mutationFn: (names: string[]) => groupsApi.reorder(names),
    onSuccess: () => {
      toast.success('Order saved')
      qc.invalidateQueries({ queryKey: ['groups'] })
      setOrderedGroups(null)
    },
    onError: (err) => {
      toast.error(extractError(err))
      setOrderedGroups(null)
    },
  })

  // ── Drag-and-drop ────────────────────────────────────────────────────────
  const dragIndex = useRef<number | null>(null)
  const dragOverIndex = useRef<number | null>(null)

  const handleDragStart = (index: number) => {
    dragIndex.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragOverIndex.current = index
    if (dragIndex.current === null || dragIndex.current === index) return

    const newList = [...displayGroups]
    const [moved] = newList.splice(dragIndex.current, 1)
    newList.splice(index, 0, moved)
    dragIndex.current = index
    setOrderedGroups(newList)
  }

  const handleDragEnd = () => {
    if (orderedGroups) {
      reorder.mutate(orderedGroups.map((g) => g.name))
    }
    dragIndex.current = null
    dragOverIndex.current = null
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Groups</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage roles and their permissions. Drag to set rank order — higher rank can manage lower rank.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Group
        </Button>
      </div>

      <div className="space-y-3">
        {displayGroups.map((group, index) => (
          <div
            key={group.name}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          >
            <GroupCard
              group={group}
              rank={index + 1}
              onDelete={(name) => deleteGroup.mutate(name)}
              dragHandleProps={{}}
            />
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
        Permission changes take effect within 30 seconds due to server-side caching.
      </p>

      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => { setCreateOpen(false); qc.invalidateQueries({ queryKey: ['groups'] }) }}
      />
    </div>
  )
}
