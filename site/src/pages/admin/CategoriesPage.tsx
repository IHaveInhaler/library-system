import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Tag, X, BookOpen } from 'lucide-react'
import { categoriesApi, type Category } from '../../api/categories'
import { booksApi } from '../../api/books'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { extractError } from '../../api/client'
import type { Book } from '../../types'

// ── Create Modal ────────────────────────────────────────────────────────────

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [nameError, setNameError] = useState('')

  const create = useMutation({
    mutationFn: () => categoriesApi.create({ name, label, color }),
    onSuccess: () => { toast.success(`Category "${label}" created`); qc.invalidateQueries({ queryKey: ['categories'] }); onClose(); setName(''); setLabel(''); setColor('#3b82f6') },
    onError: (err) => toast.error(extractError(err)),
  })

  const validateName = (v: string) => {
    if (v && !/^[A-Z][A-Z0-9_]*$/.test(v)) setNameError('Uppercase letters, digits, underscores')
    else setNameError('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Category">
      <div className="space-y-4">
        <Input label="Name (machine key)" placeholder="e.g. MYSTERY" value={name}
          onChange={(e) => { setName(e.target.value.toUpperCase()); validateName(e.target.value.toUpperCase()) }} error={nameError} />
        <Input label="Display label" placeholder="e.g. Mystery" value={label} onChange={(e) => setLabel(e.target.value)} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-9 cursor-pointer rounded border-0" />
            <input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!name || !label || !!nameError}>Create</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Category Detail Drawer ──────────────────────────────────────────────────

function CategoryDrawer({ category, onClose }: { category: Category; onClose: () => void }) {
  const qc = useQueryClient()
  const [label, setLabel] = useState(category.label)
  const [color, setColor] = useState(category.color ?? '#6b7280')

  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: ['books', 'category', category.name],
    queryFn: () => booksApi.list({ genre: category.name, limit: 50 }),
  })

  const update = useMutation({
    mutationFn: () => categoriesApi.update(category.id, { label, color }),
    onSuccess: () => { toast.success('Category updated'); qc.invalidateQueries({ queryKey: ['categories'] }) },
    onError: (err) => toast.error(extractError(err)),
  })

  const remove = useMutation({
    mutationFn: () => categoriesApi.remove(category.id),
    onSuccess: () => { toast.success('Category deleted'); qc.invalidateQueries({ queryKey: ['categories'] }); onClose() },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: (category.color ?? '#6b7280') + '20' }}>
              <Tag className="h-4 w-4" style={{ color: category.color ?? '#6b7280' }} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{category.label}</p>
              <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{category.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Edit section */}
          <div className="space-y-4">
            <Input label="Display label" value={label} onChange={(e) => setLabel(e.target.value)} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-9 cursor-pointer rounded border-0" />
                <input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <Button onClick={() => update.mutate()} loading={update.isPending}>Save changes</Button>
          </div>

          {/* Books in this category */}
          <div className="border-t border-gray-100 pt-6 dark:border-gray-700">
            <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
              Books in this category
              {books && <span className="ml-1 font-normal text-gray-400">({books.meta.total})</span>}
            </h3>
            {booksLoading ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>
            ) : !books?.data.length ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No books in this category yet.</p>
            ) : (
              <div className="space-y-2">
                {books.data.map((book: Book) => (
                  <Link
                    key={book.id}
                    to={`/manage/books?search=${encodeURIComponent(book.title)}`}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-600 dark:hover:bg-blue-900/20"
                  >
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt="" className="h-10 w-7 flex-shrink-0 rounded object-cover" />
                    ) : (
                      <div className="flex h-10 w-7 flex-shrink-0 items-center justify-center rounded bg-gray-100 dark:bg-gray-700">
                        <BookOpen className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1 dark:text-white">{book.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{book.author}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Delete */}
          <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
            <Button
              variant="ghost" size="sm"
              className="text-red-500 hover:text-red-700 dark:text-red-400"
              onClick={() => { if (confirm(`Delete "${category.label}"? Books must be reassigned first.`)) remove.mutate() }}
              loading={remove.isPending}
            >
              <Trash2 className="h-4 w-4" /> Delete category
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<Category | null>(null)

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/manage" className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Manage
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Genres and classification for books and shelves</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Category
        </Button>
      </div>

      {!categories?.length ? (
        <EmptyState icon={Tag} title="No categories" description="Create a category to start classifying books." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelected(cat)}
              className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: (cat.color ?? '#6b7280') + '20' }}>
                <Tag className="h-5 w-5" style={{ color: cat.color ?? '#6b7280' }} />
              </div>
              <div>
                <p className="font-medium text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">{cat.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{cat.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {selected && <CategoryDrawer category={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
