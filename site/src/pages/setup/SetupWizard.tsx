import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  BookOpen,
  KeyRound,
  UserPlus,
  Building2,
  Users,
  IdCard,
  Mail,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Terminal,
  Plus,
  Trash2,
  SkipForward,
  ShieldCheck,
  Database,
  RotateCcw,
} from 'lucide-react'
import { setupApi, type SetupStatus, type SetupBackup } from '../../api/setup'
import { librariesApi } from '../../api/libraries'
import { groupsApi } from '../../api/groups'
import { permissionsApi } from '../../api/permissions'
import { membershipTypesApi, type MembershipType } from '../../api/membershipTypes'
import { settingsApi, type SettingKey } from '../../api/settings'
import { useAuthStore } from '../../store/auth'
import { extractError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PERMISSIONS } from '../../lib/permissions'
import type { Library } from '../../types'

// ── Constants ───────────────────────────────────────────────────────────────

const ALL_PERMISSIONS = PERMISSIONS.map((p) => p.key)
const PERMISSION_LABEL_MAP = Object.fromEntries(PERMISSIONS.map((p) => [p.key, p.label]))

const RECOMMENDED_GROUPS = [
  {
    name: 'LIBRARIAN',
    description: 'Manage books, loans, shelves, and members',
    permissions: [
      'VIEW_LIBRARIES', 'MANAGE_BOOKS', 'MANAGE_LIBRARIES', 'MANAGE_SHELVES',
      'MANAGE_COPIES', 'ISSUE_LOANS', 'RETURN_LOANS', 'VIEW_ALL_LOANS',
      'MANAGE_RESERVATIONS', 'VIEW_ALL_RESERVATIONS', 'MANAGE_MEMBERSHIPS',
      'VIEW_USERS', 'MANAGE_USERS', 'RESET_USER_PASSWORD',
    ],
  },
  {
    name: 'MEMBER',
    description: 'Browse catalogue, place reservations, view loans',
    permissions: ['VIEW_LIBRARIES'],
  },
]

// ── Step definitions ────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Verify', icon: KeyRound },
  { label: 'Admin', icon: UserPlus },
  { label: 'Library', icon: Building2 },
  { label: 'Groups', icon: Users },
  { label: 'Members', icon: IdCard },
  { label: 'Email', icon: Mail },
  { label: 'Access', icon: ShieldCheck },
  { label: 'Done', icon: CheckCircle2 },
] as const

// ── Progress bar ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-10 flex items-center justify-center gap-1">
      {STEPS.map((step, i) => {
        const Icon = step.icon
        const done = i < current
        const active = i === current
        return (
          <div key={step.label} className="flex items-center gap-1">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                done
                  ? 'bg-blue-600 text-white'
                  : active
                    ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-600 dark:bg-blue-900/40 dark:text-blue-400 dark:ring-blue-400'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 transition-colors ${
                  i < current ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
        checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

// ── Step 0: Welcome & Verify Code ───────────────────────────────────────────

function WelcomeStep({
  onVerified,
  backupCount,
  isDev,
}: {
  onVerified: (token: string, path: 'fresh' | 'restore' | 'seed') => void
  backupCount: number
  isDev: boolean
}) {
  const [phase, setPhase] = useState<'choose' | 'intro' | 'waiting' | 'input'>(
    backupCount > 0 ? 'choose' : 'intro'
  )
  const [chosenPath, setChosenPath] = useState<'fresh' | 'restore' | 'seed' | null>(
    backupCount > 0 ? null : 'fresh'
  )
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      await setupApi.generateCode()
      setPhase('waiting')
      toast.success('Setup code printed to server console')
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) return
    setLoading(true)
    try {
      const { setupToken } = await setupApi.verifyCode(code)
      onVerified(setupToken, chosenPath!)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleChoose = (path: 'fresh' | 'restore' | 'seed') => {
    setChosenPath(path)
    setPhase('intro')
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
        <BookOpen className="h-8 w-8 text-white" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
        Welcome to Library Portal
      </h1>
      <p className="mb-8 text-gray-500 dark:text-gray-400">
        {phase === 'choose'
          ? 'How would you like to set up your system?'
          : "Let's get your library system set up. First, verify you have access to the server."}
      </p>

      {phase === 'choose' && (
        <div className="space-y-3 text-left">
          <button
            onClick={() => handleChoose('restore')}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-blue-500 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <RotateCcw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-white">Restore from backup</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                  {backupCount} available
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Restore a previous database backup
              </p>
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
          </button>

          <button
            onClick={() => handleChoose('fresh')}
            className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/50"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
              <Database className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-gray-900 dark:text-white">Start fresh</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Set up a new library system from scratch
              </p>
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
          </button>

          {isDev && (
            <button
              onClick={() => handleChoose('seed')}
              className="flex w-full items-center gap-4 rounded-xl border border-dashed border-gray-300 bg-white p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700/50"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                <Terminal className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-gray-900 dark:text-white">Seed demo data</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Populate with sample data and dev accounts
                </p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
            </button>
          )}
        </div>
      )}

      {phase === 'intro' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-left dark:border-gray-700 dark:bg-gray-800/50">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Terminal className="h-4 w-4" />
              How it works
            </div>
            <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>1. Click the button below to generate a setup code</li>
              <li>
                2. Check the server console or{' '}
                <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                  docker compose logs api
                </code>{' '}
                for the code
              </li>
              <li>3. Enter the 6-digit code to continue</li>
            </ol>
          </div>
          <Button onClick={handleGenerate} loading={loading} className="w-full">
            Generate Setup Code
          </Button>
          {backupCount > 0 && (
            <button
              type="button"
              onClick={() => { setPhase('choose'); setChosenPath(null) }}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              ← Back to options
            </button>
          )}
        </div>
      )}

      {phase === 'waiting' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-400">
            A 6-digit code has been printed to the server console. Check your terminal or run{' '}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs dark:bg-amber-900/40">
              docker compose logs api
            </code>
          </div>
          <button
            onClick={() => setPhase('input')}
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            I have the code →
          </button>
        </div>
      )}

      {phase === 'input' && (
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-4 text-center text-3xl font-mono tracking-[0.5em] text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-600"
              autoFocus
            />
          </div>
          <Button type="submit" loading={loading} disabled={code.length !== 6} className="w-full">
            Verify Code
          </Button>
          <button
            type="button"
            onClick={handleGenerate}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Generate a new code
          </button>
        </form>
      )}
    </div>
  )
}

// ── Step 1: Create Admin ────────────────────────────────────────────────────

function AdminStep({ setupToken, onCreated }: { setupToken: string; onCreated: () => void }) {
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const { email, password, firstName, lastName } = form
      const res = await setupApi.createAdmin(setupToken, { email, password, firstName, lastName })
      setAuth(res.user, res.accessToken, res.refreshToken)
      toast.success('Admin account created')
      onCreated()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">Create Admin Account</h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        This will be the first administrator of the system.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First name"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
          <Input
            label="Last name"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
        </div>
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="admin@example.com"
          required
        />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="At least 8 characters"
          required
        />
        <Input
          label="Confirm password"
          type="password"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          placeholder="Repeat password"
          required
        />
        <Button type="submit" loading={loading} className="w-full">
          Create Admin <ChevronRight className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}

// ── Step 2: Create Libraries ────────────────────────────────────────────────

function LibraryStep({
  libraries,
  setLibraries,
  onNext,
}: {
  libraries: Library[]
  setLibraries: (libs: Library[]) => void
  onNext: () => void
}) {
  const [form, setForm] = useState({ name: '', labelPrefix: '', email: '', isPrivate: false })
  const [loading, setLoading] = useState(false)
  const prefixError = form.labelPrefix.length > 0 && form.labelPrefix.length > 3 ? 'Prefix must be 3 letters or less' : ''

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.labelPrefix || prefixError) return
    setLoading(true)
    try {
      const lib = await librariesApi.create({
        name: form.name,
        labelPrefix: form.labelPrefix.toUpperCase(),
        email: form.email || undefined,
        isPrivate: form.isPrivate,
      })
      setLibraries([...libraries, lib])
      setForm({ name: '', labelPrefix: '', email: '', isPrivate: false })
      toast.success(`Library "${lib.name}" created`)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (lib: Library) => {
    try {
      await librariesApi.remove(lib.id)
      setLibraries(libraries.filter((l) => l.id !== lib.id))
      toast.success(`Removed "${lib.name}"`)
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">Create Libraries</h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Add at least one library to get started. You can add more later.
      </p>

      {libraries.length > 0 && (
        <div className="mb-6 space-y-2">
          {libraries.map((lib) => (
            <div
              key={lib.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white">{lib.name}</span>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-mono text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                  {lib.labelPrefix}
                </span>
                {lib.isPrivate && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                    Private
                  </span>
                )}
              </div>
              <button
                onClick={() => handleRemove(lib)}
                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Input
              label="Library name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Central City Library"
              required
            />
          </div>
          <Input
            label="Prefix"
            value={form.labelPrefix}
            onChange={(e) => setForm({ ...form, labelPrefix: e.target.value.toUpperCase().slice(0, 3) })}
            placeholder="CEN"
            maxLength={3}
            required
            error={prefixError}
          />
        </div>
        <Input
          label="Email (optional)"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="library@example.com"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isPrivate}
            onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Private library
          <span className="text-xs text-gray-400 dark:text-gray-500">(members only)</span>
        </label>
        <Button type="submit" variant="secondary" loading={loading} className="w-full">
          <Plus className="h-4 w-4" /> Add Library
        </Button>
      </form>

      <div className="mt-6 flex justify-end">
        <Button onClick={onNext} disabled={libraries.length === 0}>
          Continue <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Step 3: Groups (reworked) ───────────────────────────────────────────────

interface GroupDraft {
  name: string
  description: string
  permissions: Set<string>
  saved: boolean       // true once POST /groups succeeded
  expanded: boolean
}

function GroupsStep({ onNext }: { onNext: () => void }) {
  const [groups, setGroups] = useState<GroupDraft[]>(() =>
    RECOMMENDED_GROUPS.map((g) => ({
      name: g.name,
      description: g.description,
      permissions: new Set(g.permissions),
      saved: false,
      expanded: false,
    }))
  )
  const [addName, setAddName] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState('')

  const updateGroup = (idx: number, patch: Partial<GroupDraft>) => {
    setGroups((prev) => prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)))
  }

  const removeGroup = (idx: number) => {
    setGroups((prev) => prev.filter((_, i) => i !== idx))
  }

  const togglePermission = (idx: number, perm: string) => {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== idx) return g
        const perms = new Set(g.permissions)
        if (perms.has(perm)) perms.delete(perm)
        else perms.add(perm)
        return { ...g, permissions: perms }
      })
    )
  }

  const validateName = (v: string) => {
    if (!v) { setNameError(''); return }
    if (v === 'ADMIN') { setNameError('ADMIN is a reserved group'); return }
    if (groups.some((g) => g.name === v)) { setNameError('Name already used'); return }
    if (!/^[A-Z][A-Z0-9_]*$/.test(v)) { setNameError('Uppercase letters, digits, underscores only'); return }
    setNameError('')
  }

  const handleAddGroup = () => {
    if (!addName || nameError) return
    setGroups((prev) => [
      ...prev,
      { name: addName, description: addDesc, permissions: new Set(), saved: false, expanded: true },
    ])
    setAddName('')
    setAddDesc('')
    setShowAdd(false)
  }

  const handleSaveAndContinue = async () => {
    setSaving(true)
    try {
      // Fetch existing groups to know which already exist
      const existing = await groupsApi.list()
      const existingNames = new Set(existing.map((g) => g.name))

      for (const g of groups) {
        // Only create if it doesn't already exist (built-in groups like LIBRARIAN/MEMBER already exist)
        if (!existingNames.has(g.name)) {
          await groupsApi.create({ name: g.name, description: g.description || undefined })
        }
        // Set permissions — enable granted ones
        for (const perm of g.permissions) {
          await permissionsApi.set(g.name, perm, true)
        }
        // Disable permissions not in the set
        for (const perm of ALL_PERMISSIONS) {
          if (!g.permissions.has(perm)) {
            await permissionsApi.set(g.name, perm, false)
          }
        }
      }

      // Reorder: ADMIN first, then user groups in order
      const allGroups = await groupsApi.list()
      const names = ['ADMIN', ...groups.map((g) => g.name)]
      for (const g of allGroups) {
        if (!names.includes(g.name)) names.push(g.name)
      }
      await groupsApi.reorder(names)

      toast.success(`${groups.length} group${groups.length === 1 ? '' : 's'} configured`)
      onNext()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  const grantedCount = (g: GroupDraft) => g.permissions.size

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">Groups & Roles</h2>
      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
        The <span className="font-medium text-gray-700 dark:text-gray-300">ADMIN</span> group is
        built-in and always has full permissions. Below are recommended groups — edit, remove, or add your own.
      </p>
      <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">
        Click a group to expand and configure its permissions.
      </p>

      {/* Group list */}
      <div className="space-y-3">
        {groups.map((g, idx) => (
          <div
            key={idx}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          >
            {/* Header */}
            <div
              className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30"
              onClick={() => updateGroup(idx, { expanded: !g.expanded })}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white">{g.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {g.description || 'No description'} · {grantedCount(g)} / {ALL_PERMISSIONS.length} permissions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeGroup(idx)
                  }}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                  title="Remove group"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform ${g.expanded ? 'rotate-180' : ''}`}
                />
              </div>
            </div>

            {/* Expanded: name, description, permissions */}
            {g.expanded && (
              <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-700">
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Name</label>
                    <input
                      value={g.name}
                      onChange={(e) => updateGroup(idx, { name: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
                    <input
                      value={g.description}
                      onChange={(e) => updateGroup(idx, { description: e.target.value })}
                      placeholder="Optional"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Permissions
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ALL_PERMISSIONS.map((perm) => (
                    <div key={perm} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {PERMISSION_LABEL_MAP[perm]}
                      </span>
                      <Toggle
                        checked={g.permissions.has(perm)}
                        onChange={() => togglePermission(idx, perm)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add custom group */}
      {showAdd ? (
        <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800/50">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Group name"
                placeholder="e.g. SENIOR_LIBRARIAN"
                value={addName}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase()
                  setAddName(v)
                  validateName(v)
                }}
                error={nameError}
              />
            </div>
            <div>
              <Input
                label="Description (optional)"
                placeholder="What this group is for"
                value={addDesc}
                onChange={(e) => setAddDesc(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setShowAdd(false); setAddName(''); setAddDesc(''); setNameError('') }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddGroup} disabled={!addName || !!nameError}>
              <Plus className="h-3.5 w-3.5" /> Add Group
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300"
        >
          <Plus className="h-4 w-4" /> Add Custom Group
        </button>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <Button variant="ghost" onClick={onNext} className="flex-1">
          <SkipForward className="h-4 w-4" /> Skip
        </Button>
        <Button onClick={handleSaveAndContinue} loading={saving} disabled={groups.length === 0} className="flex-1">
          Save & Continue <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Step 4: Membership Types (skippable) ────────────────────────────────────

function MembershipTypesStep({ onNext }: { onNext: () => void }) {
  const [types, setTypes] = useState<MembershipType[]>([])
  const [loaded, setLoaded] = useState(false)

  // Load existing built-in types on mount
  useState(() => {
    membershipTypesApi.list().then((all) => {
      setTypes(all)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  })

  const [addName, setAddName] = useState('')
  const [addLabel, setAddLabel] = useState('')
  const [addDuration, setAddDuration] = useState('')
  const [addStaff, setAddStaff] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [nameError, setNameError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const validateName = (v: string) => {
    if (!v) { setNameError(''); return }
    if (types.some((t) => t.name === v)) { setNameError('Name already used'); return }
    if (!/^[A-Z][A-Z0-9_]*$/.test(v)) { setNameError('Uppercase letters, digits, underscores only'); return }
    setNameError('')
  }

  const handleAdd = async () => {
    if (!addName || !addLabel || nameError) return
    setAddLoading(true)
    try {
      const created = await membershipTypesApi.create({
        name: addName,
        label: addLabel,
        durationDays: addDuration ? parseInt(addDuration, 10) : null,
        isStaff: addStaff,
      })
      setTypes((prev) => [...prev, created])
      setAddName('')
      setAddLabel('')
      setAddDuration('')
      setAddStaff(false)
      setShowAdd(false)
      toast.success(`Type "${created.label}" created`)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setAddLoading(false)
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await membershipTypesApi.remove(id)
      setTypes((prev) => prev.filter((t) => t.id !== id))
      toast.success('Type removed')
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  if (!loaded) return <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">Membership Types</h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        These define how users access libraries. <strong>Staff</strong> types grant management access. You can add custom types or continue with the defaults.
      </p>

      <div className="space-y-2">
        {types.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white">{t.label}</span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-500 dark:bg-gray-700 dark:text-gray-400">{t.name}</span>
                {t.isStaff && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">Staff</span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t.durationDays ? `${t.durationDays} days` : 'No expiry'}
                {t.isBuiltIn && ' · Built-in'}
              </p>
            </div>
            {!t.isBuiltIn && (
              <button
                onClick={() => handleRemove(t.id)}
                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {showAdd ? (
        <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800/50">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Name"
              placeholder="e.g. WEEKLY"
              value={addName}
              onChange={(e) => { const v = e.target.value.toUpperCase(); setAddName(v); validateName(v) }}
              error={nameError}
            />
            <Input
              label="Label"
              placeholder="e.g. Weekly"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Input
              label="Duration (days)"
              type="number"
              placeholder="Empty = no expiry"
              value={addDuration}
              onChange={(e) => setAddDuration(e.target.value)}
            />
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addStaff}
                  onChange={(e) => setAddStaff(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                Staff access
              </label>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setShowAdd(false); setAddName(''); setAddLabel(''); setAddDuration(''); setAddStaff(false); setNameError('') }}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={addLoading} disabled={!addName || !addLabel || !!nameError}>
              <Plus className="h-3.5 w-3.5" /> Add Type
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300"
        >
          <Plus className="h-4 w-4" /> Add Custom Type
        </button>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={onNext}>
          Continue <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Step 5: SMTP (skippable) ────────────────────────────────────────────────

function SmtpStep({ onNext }: { onNext: () => void }) {
  const [form, setForm] = useState({
    'smtp.enabled': 'true',
    'smtp.host': '',
    'smtp.port': '587',
    'smtp.user': '',
    'smtp.pass': '',
    'smtp.from': '',
    'app.baseUrl': '',
  })
  const [loading, setLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await settingsApi.update(form as Record<SettingKey, string>)
      toast.success('Email settings saved')
      onNext()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">Email Settings</h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Configure SMTP for password reset emails. You can skip this and set it up later.
      </p>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Input
              label="SMTP Host"
              value={form['smtp.host']}
              onChange={(e) => setForm({ ...form, 'smtp.host': e.target.value })}
              placeholder="smtp.example.com"
            />
          </div>
          <Input
            label="Port"
            value={form['smtp.port']}
            onChange={(e) => setForm({ ...form, 'smtp.port': e.target.value })}
            placeholder="587"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Username"
            value={form['smtp.user']}
            onChange={(e) => setForm({ ...form, 'smtp.user': e.target.value })}
            placeholder="user@example.com"
          />
          <Input
            label="Password"
            type="password"
            value={form['smtp.pass']}
            onChange={(e) => setForm({ ...form, 'smtp.pass': e.target.value })}
            placeholder="••••••••"
          />
        </div>
        <Input
          label="From address"
          value={form['smtp.from']}
          onChange={(e) => setForm({ ...form, 'smtp.from': e.target.value })}
          placeholder="Library Portal <noreply@example.com>"
        />
        <Input
          label="Site base URL"
          value={form['app.baseUrl']}
          onChange={(e) => setForm({ ...form, 'app.baseUrl': e.target.value })}
          placeholder="https://library.example.com"
        />

        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={onNext} className="flex-1">
            <SkipForward className="h-4 w-4" /> Skip
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Save & Continue <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}

// ── Step 6: Registration Settings (skippable) ──────────────────────────────

function RegistrationStep({ onNext }: { onNext: () => void }) {
  const [mode, setMode] = useState('open')
  const [domain, setDomain] = useState('')
  const [requireApproval, setRequireApproval] = useState(false)
  const [requireEmail, setRequireEmail] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsApi.update({
        'reg.mode': mode,
        'reg.allowedDomain': domain,
        'reg.requireApproval': requireApproval ? 'true' : 'false',
        'reg.requireEmailConfirmation': requireEmail ? 'true' : 'false',
      })
      toast.success('Registration settings saved')
      onNext()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">Registration</h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Control who can create an account. You can change this later in admin settings.
      </p>

      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Registration mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="open">Open — anyone can register</option>
            <option value="domain">Email domain — restrict to a specific domain</option>
            <option value="token">Registration token — require a token</option>
            <option value="disabled">Disabled — registration is closed</option>
          </select>
        </div>

        {mode === 'domain' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">@</span>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value.toLowerCase())}
              placeholder="company.com"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        )}

        <div className="space-y-3 border-t border-gray-100 pt-4 dark:border-gray-700">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Require approval</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">New accounts stay inactive until activated by an admin.</p>
            </div>
            <button type="button" role="switch" aria-checked={requireApproval} onClick={() => setRequireApproval(!requireApproval)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${requireApproval ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${requireApproval ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Require email confirmation</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Send a 6-digit code to verify email before activating.</p>
            </div>
            <button type="button" role="switch" aria-checked={requireEmail} onClick={() => setRequireEmail(!requireEmail)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${requireEmail ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${requireEmail ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onNext} className="flex-1">
            <SkipForward className="h-4 w-4" /> Skip
          </Button>
          <Button onClick={handleSave} loading={saving} className="flex-1">
            Save & Continue <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Step 7: Complete ────────────────────────────────────────────────────────

function CompleteStep({
  libraries,
  groups,
  onFinish,
}: {
  libraries: Library[]
  groups: string[]
  onFinish: () => void
}) {
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)

  const handleFinish = async () => {
    setLoading(true)
    try {
      await setupApi.complete()
      onFinish()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/40">
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">All Set!</h2>
      <p className="mb-8 text-gray-500 dark:text-gray-400">
        Your library portal is ready to go.
      </p>

      <div className="mb-8 space-y-3 text-left">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Admin account</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {user?.firstName} {user?.lastName} ({user?.email})
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {libraries.length === 1 ? 'Library' : 'Libraries'}
          </div>
          <div className="font-medium text-gray-900 dark:text-white">
            {libraries.map((l) => l.name).join(', ')}
          </div>
        </div>
        {groups.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Groups</div>
            <div className="font-medium text-gray-900 dark:text-white">
              ADMIN, {groups.join(', ')}
            </div>
          </div>
        )}
      </div>

      <Button onClick={handleFinish} loading={loading} className="w-full" size="lg">
        Go to Dashboard <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ── Restore from Backup ────────────────────────────────────────────────────

function RestoreStep({ setupToken, onRestored }: { setupToken: string; onRestored: () => void }) {
  const [backups, setBackups] = useState<SetupBackup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    setupApi
      .listBackups(setupToken)
      .then((list) => {
        setBackups(list)
        if (list.length > 0) setSelectedId(list[0].id)
      })
      .catch((err) => toast.error(extractError(err)))
      .finally(() => setLoading(false))
  }, [setupToken])

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleRestore = async () => {
    if (!selectedId) return
    setRestoring(true)
    try {
      await setupApi.restoreBackup(setupToken, selectedId)
      setRestored(true)
      toast.success('Backup restored successfully')
      setTimeout(() => {
        window.location.href = '/'
      }, 3000)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setRestoring(false)
    }
  }

  if (restored) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40">
          <RotateCcw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Restarting...</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The database has been restored. The page will reload shortly.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading backups...</p>
      </div>
    )
  }

  if (backups.length === 0) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700">
          <Database className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">No Backups Found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          There are no backups available to restore.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">Restore from Backup</h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Select a backup to restore. This will replace the current database.
      </p>

      <div className="space-y-2">
        {backups.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedId(b.id)}
            className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
              selectedId === b.id
                ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/50'
            }`}
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
              <Database className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 dark:text-white">{b.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(b.createdAt)} · {formatSize(b.size)} · {b.reason}
              </p>
            </div>
            <div
              className={`h-4 w-4 flex-shrink-0 rounded-full border-2 ${
                selectedId === b.id
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {selectedId === b.id && (
                <div className="h-full w-full rounded-full border-2 border-white dark:border-gray-800" />
              )}
            </div>
          </button>
        ))}
      </div>

      <Button
        onClick={handleRestore}
        loading={restoring}
        disabled={!selectedId}
        className="mt-6 w-full"
      >
        <RotateCcw className="h-4 w-4" /> Restore Selected Backup
      </Button>
    </div>
  )
}

// ── Main Wizard ─────────────────────────────────────────────────────────────

export default function SetupWizard({
  onComplete,
  status,
}: {
  onComplete?: () => void
  status?: SetupStatus
}) {
  const setAuth = useAuthStore((s) => s.setAuth)
  const [step, setStep] = useState(0)
  const [setupToken, setSetupToken] = useState('')
  const [chosenPath, setChosenPath] = useState<'fresh' | 'restore' | 'seed' | null>(null)
  const [libraries, setLibraries] = useState<Library[]>([])
  const [createdGroups, setCreatedGroups] = useState<string[]>([])
  const [devLoading, setDevLoading] = useState(false)
  const [resumeLoading, setResumeLoading] = useState(false)

  const isDev = status?.environment === 'development'
  const hasExisting = status?.hasExistingData ?? false

  const next = () => setStep((s) => s + 1)

  const handleDevSeedDirect = async (token: string) => {
    setDevLoading(true)
    try {
      const res = await setupApi.devSeed(token)
      setAuth(res.user, res.accessToken, res.refreshToken)
      toast.success('Dev environment ready — logged in as admin@library.com')
      onComplete?.()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setDevLoading(false)
    }
  }

  const handleResume = async () => {
    setResumeLoading(true)
    try {
      await setupApi.resume()
      toast.success('Resumed with existing database')
      onComplete?.()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setResumeLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-lg">
        <StepIndicator current={step} />

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {step === 0 && (
            <WelcomeStep
              backupCount={status?.backupCount ?? 0}
              isDev={isDev}
              onVerified={(token, path) => {
                setSetupToken(token)
                setChosenPath(path)
                if (path === 'seed') {
                  handleDevSeedDirect(token)
                } else {
                  next()
                }
              }}
            />
          )}
          {step === 1 && chosenPath === 'restore' && (
            <RestoreStep setupToken={setupToken} onRestored={() => onComplete?.()} />
          )}
          {step === 1 && chosenPath !== 'restore' && (
            <AdminStep setupToken={setupToken} onCreated={next} />
          )}
          {step === 2 && (
            <LibraryStep libraries={libraries} setLibraries={setLibraries} onNext={next} />
          )}
          {step === 3 && (
            <GroupsStep
              onNext={() => {
                groupsApi.list().then((all) => {
                  setCreatedGroups(all.filter((g) => g.name !== 'ADMIN').map((g) => g.name))
                }).catch(() => {})
                next()
              }}
            />
          )}
          {step === 4 && <MembershipTypesStep onNext={next} />}
          {step === 5 && <SmtpStep onNext={next} />}
          {step === 6 && <RegistrationStep onNext={next} />}
          {step === 7 && (
            <CompleteStep
              libraries={libraries}
              groups={createdGroups}
              onFinish={() => onComplete?.()}
            />
          )}
        </div>

        {step > 1 && step < 7 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="mt-4 flex w-full items-center justify-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        )}

        {/* Resume existing DB — dev only */}
        {step === 0 && isDev && hasExisting && (
          <div className="mt-6">
            <button
              onClick={handleResume}
              disabled={resumeLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {resumeLoading ? 'Resuming...' : 'Use existing database →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
