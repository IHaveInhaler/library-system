import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Tag, Pencil, Check, X, GripVertical } from 'lucide-react'
import { categoriesApi, type Category } from '../../api/categories'
import { PageSpinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { extractError } from '../../api/client'

// ── Color Swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({ color, size = 'md' }: { color: string | null; size?: 'sm' | 'md' }) {
  const px = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  if (!color) {
    return (
      <span className={`${px} inline-block rounded-full border border-dashed border-gray-300 dark:border-gray-600`} title="No color" />
    )
  }
  return (
    <span
      className={`${px} inline-block rounded-full border border-gray-200 dark:border-gray-600`}
      style={{ backgroundColor: color }}
      title={color}
    />
  )
}

// ── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [useColor, setUseColor] = useState(false)
  const [nameError, setNameError] = useState('')

  const create = useMutation({
    mutationFn: () =>
      categoriesApi.create({
        name,
        label,
        color: useColor ? color : undefined,
      }),
    onSuccess: () => {
      toast.success(`Category "${label}" created`)
      onSuccess()
      handleClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const handleClose = () => {
    setName('')
    setLabel('')
    setColor('#6366f1')
    setUseColor(false)
    setNameError('')
    onClose()
  }

  const validateName = (v: string) => {
    if (!/^[A-Z][A-Z0-9_]*$/.test(v)) setNameError('Uppercase letters, digits, underscores — starts with letter')
    else setNameError('')
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create Category">
      <div className="space-y-4">
        <Input
          label="Name (machine key)"
          placeholder="e.g. FICTION"
          value={name}
          onChange={(e) => { setName(e.target.value.toUpperCase()); validateName(e.target.value.toUpperCase()) }}
          error={nameError}
        />
        <Input
          label="Display label"
          placeholder="e.g. Fiction"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={useColor}
              onChange={(e) => setUseColor(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            Assign a color
          </label>
          {useColor && (
            <div className="mt-2 flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded-lg border border-gray-300 bg-transparent p-0.5 dark:border-gray-600"
              />
              <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{color}</span>
            </div>
          )}
        </div>
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

// ── Category Card ────────────────────────────────────────────────────────────

function CategoryCard({ category, onDelete }: { category: Category; onDelete: (id: string) => void }) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState(category.label)
  const [editingColor, setEditingColor] = useState(false)
  const [colorDraft, setColorDraft] = useState(category.color ?? '#6366f1')
  const qc = useQueryClient()

  const updateLabel = useMutation({
    mutationFn: () => categoriesApi.update(category.id, { label: labelDraft }),
    onSuccess: () => { toast.success('Label updated'); setEditingLabel(false); qc.invalidateQueries({ queryKey: ['categories'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  const updateColor = useMutation({
    mutationFn: () => categoriesApi.update(category.id, { color: colorDraft }),
    onSuccess: () => { toast.success('Color updated'); setEditingColor(false); qc.invalidateQueries({ queryKey: ['categories'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex cursor-grab items-center text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 active:cursor-grabbing">
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
          <Tag className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Label row */}
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
                <button onClick={() => { setEditingLabel(false); setLabelDraft(category.label) }} className="rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-gray-900 dark:text-white">{category.label}</p>
                <button
                  onClick={() => setEditingLabel(true)}
                  className="rounded p-0.5 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Info row: name + color */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-mono">{category.name}</span>
            <span>·</span>
            {editingColor ? (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="color"
                  value={colorDraft}
                  onChange={(e) => setColorDraft(e.target.value)}
                  className="h-5 w-5 cursor-pointer rounded border border-gray-300 bg-transparent p-0 dark:border-gray-600"
                />
                <span className="font-mono text-[11px]">{colorDraft}</span>
                <button onClick={() => updateColor.mutate()} className="rounded p-0.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"><Check className="h-3 w-3" /></button>
                <button onClick={() => { setEditingColor(false); setColorDraft(category.color ?? '#6366f1') }} className="rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-3 w-3" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <ColorSwatch color={category.color} size="sm" />
                {category.color && <span className="font-mono text-[11px]">{category.color}</span>}
                {!category.color && <span className="text-[11px]">No color</span>}
                <button
                  onClick={() => setEditingColor(true)}
                  className="rounded p-0.5 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
            <span>·</span>
            <span>#{category.order}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-red-500 dark:text-red-400">Delete?</span>
              <button
                onClick={() => onDelete(category.id)}
                className="rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                title="Confirm delete"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
              title="Delete category"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [orderedCategories, setOrderedCategories] = useState<Category[] | null>(null)
  const qc = useQueryClient()

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    select: (data) => [...data].sort((a, b) => a.order - b.order),
  })

  const displayCategories = orderedCategories ?? categories ?? []

  const deleteCategory = useMutation({
    mutationFn: categoriesApi.remove,
    onSuccess: () => {
      toast.success('Category deleted')
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const reorder = useMutation({
    mutationFn: (ids: string[]) => categoriesApi.reorder(ids),
    onSuccess: () => {
      toast.success('Order saved')
      qc.invalidateQueries({ queryKey: ['categories'] })
      setOrderedCategories(null)
    },
    onError: (err) => {
      toast.error(extractError(err))
      setOrderedCategories(null)
    },
  })

  // ── Drag-and-drop ──────────────────────────────────────────────────────────
  const dragIndex = useRef<number | null>(null)
  const dragOverIndex = useRef<number | null>(null)

  const handleDragStart = (index: number) => {
    dragIndex.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragOverIndex.current = index
    if (dragIndex.current === null || dragIndex.current === index) return

    const newList = [...displayCategories]
    const [moved] = newList.splice(dragIndex.current, 1)
    newList.splice(index, 0, moved)
    dragIndex.current = index
    setOrderedCategories(newList)
  }

  const handleDragEnd = () => {
    if (orderedCategories) {
      reorder.mutate(orderedCategories.map((c) => c.id))
    }
    dragIndex.current = null
    dragOverIndex.current = null
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/manage" className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Manage
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage book and shelf categories (genres). Drag to reorder.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Category
        </Button>
      </div>

      {displayCategories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center dark:border-gray-700">
          <Tag className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No categories yet. Create your first one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayCategories.map((category, index) => (
            <div
              key={category.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              <CategoryCard
                category={category}
                onDelete={(id) => deleteCategory.mutate(id)}
              />
            </div>
          ))}
        </div>
      )}

      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['categories'] })}
      />
    </div>
  )
}
