import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Settings, Mail, Lock, AlertTriangle, Code2, Users, Globe } from 'lucide-react'
import { settingsApi, type SettingKey } from '../../api/settings'
import { setupApi } from '../../api/setup'
import { useAuthStore } from '../../store/auth'
import { Button } from '../../components/ui/Button'
import { extractError } from '../../api/client'

type SmtpFormState = {
  'smtp.enabled': string
  'smtp.host': string
  'smtp.port': string
  'smtp.user': string
  'smtp.pass': string
  'smtp.from': string
}

const EMPTY_SMTP: SmtpFormState = {
  'smtp.enabled': 'false',
  'smtp.host': '',
  'smtp.port': '587',
  'smtp.user': '',
  'smtp.pass': '',
  'smtp.from': '',
}

// ── SMTP Section ──────────────────────────────────────────────────────────────
function SmtpSettings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })

  const [form, setForm] = useState<SmtpFormState>(EMPTY_SMTP)

  useEffect(() => {
    if (data) setForm({ ...EMPTY_SMTP, ...data.settings })
  }, [data])

  const locked = data?.locked ?? []
  const isLocked = (key: SettingKey) => locked.includes(key)

  const save = useMutation({
    mutationFn: () => settingsApi.update(form as Partial<Record<SettingKey, string>>),
    onSuccess: (res) => {
      toast.success('Settings saved')
      qc.setQueryData(['settings'], res)
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const enabled = form['smtp.enabled'] === 'true'

  if (isLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>

  const LockedBadge = () => (
    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
      <Lock className="h-3 w-3" /> env
    </span>
  )

  const field = (
    key: keyof SmtpFormState,
    label: string,
    opts: { type?: string; placeholder?: string; disabled?: boolean } = {}
  ) => {
    const locked = isLocked(key as SettingKey)
    return (
      <div>
        <label className="mb-1.5 flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}{locked && <LockedBadge />}
        </label>
        <input
          type={opts.type ?? 'text'}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          placeholder={opts.placeholder}
          disabled={locked || opts.disabled}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
        />
      </div>
    )
  }

  const allSmtpLocked = (['smtp.enabled', 'smtp.host', 'smtp.port', 'smtp.user', 'smtp.pass', 'smtp.from'] as SettingKey[])
    .every(isLocked)

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
          <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Email / SMTP</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Used for password reset emails. If disabled, reset links are logged to the console.
            {locked.length > 0 && (
              <span className="ml-1">Fields marked <span className="font-medium text-amber-600 dark:text-amber-400">env</span> are set via environment variables and cannot be edited here.</span>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setForm({ ...form, 'smtp.enabled': e.target.checked ? 'true' : 'false' })}
              disabled={isLocked('smtp.enabled')}
              className="rounded border-gray-300 disabled:cursor-not-allowed dark:border-gray-600"
            />
            Enable SMTP email sending
            {isLocked('smtp.enabled') && <LockedBadge />}
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            {field('smtp.host', 'SMTP Host', { placeholder: 'smtp.example.com', disabled: !enabled })}
          </div>
          <div className="col-span-2 sm:col-span-1">
            {field('smtp.port', 'Port', { placeholder: '587', disabled: !enabled })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            {field('smtp.user', 'Username', { placeholder: 'user@example.com', disabled: !enabled })}
          </div>
          <div className="col-span-2 sm:col-span-1">
            {field('smtp.pass', 'Password', { type: 'password', placeholder: '••••••••', disabled: !enabled })}
          </div>
        </div>

        {field('smtp.from', 'From address', { placeholder: 'Library Portal <noreply@example.com>', disabled: !enabled })}

        {!allSmtpLocked && (
          <div className="flex justify-end pt-2">
            <Button onClick={() => save.mutate()} loading={save.isPending}>Save settings</Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── General Section ───────────────────────────────────────────────────────

function GeneralSettings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const [baseUrl, setBaseUrl] = useState('')

  useEffect(() => {
    if (data) setBaseUrl(data.settings['app.baseUrl'] || '')
  }, [data])

  const locked = data?.locked ?? []
  const isLocked = locked.includes('app.baseUrl' as SettingKey)

  const save = useMutation({
    mutationFn: () => settingsApi.update({ 'app.baseUrl': baseUrl }),
    onSuccess: (res) => { toast.success('Settings saved'); qc.setQueryData(['settings'], res) },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
          <Globe className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">General</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Core system settings.</p>
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div>
          <label className="mb-1.5 flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
            Site base URL
            {isLocked && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                <Lock className="h-3 w-3" /> env
              </span>
            )}
          </label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://library.example.com"
            disabled={isLocked}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Used for password reset links, account invite emails, and other outbound URLs.
          </p>
        </div>
        {!isLocked && (
          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} loading={save.isPending}>Save</Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Registration Settings Section ─────────────────────────────────────────

function RegistrationSettings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })

  const [mode, setMode] = useState('open')
  const [domain, setDomain] = useState('')
  const [token, setToken] = useState('')
  const [requireApproval, setRequireApproval] = useState(false)
  const [requireEmail, setRequireEmail] = useState(false)

  useEffect(() => {
    if (data) {
      setMode(data.settings['reg.mode'] || 'open')
      setDomain(data.settings['reg.allowedDomain'] || '')
      setToken(data.settings['reg.token'] || '')
      setRequireApproval(data.settings['reg.requireApproval'] === 'true')
      setRequireEmail(data.settings['reg.requireEmailConfirmation'] === 'true')
    }
  }, [data])

  const save = useMutation({
    mutationFn: () => settingsApi.update({
      'reg.mode': mode,
      'reg.allowedDomain': domain,
      'reg.token': token,
      'reg.requireApproval': requireApproval ? 'true' : 'false',
      'reg.requireEmailConfirmation': requireEmail ? 'true' : 'false',
    }),
    onSuccess: (res) => { toast.success('Registration settings saved'); qc.setQueryData(['settings'], res) },
    onError: (err) => toast.error(extractError(err)),
  })

  const generateToken = () => {
    setToken(crypto.randomUUID())
  }

  if (isLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
          <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Registration</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Control who can create an account.</p>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {/* Mode selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Registration mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="open">Open — anyone can register</option>
            <option value="domain">Email domain — restrict to a specific domain</option>
            <option value="token">Registration token — require a token to register</option>
            <option value="disabled">Disabled — registration is closed</option>
          </select>
        </div>

        {/* Domain field */}
        {mode === 'domain' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Allowed email domain</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">@</span>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value.toLowerCase())}
                placeholder="company.com"
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              />
            </div>
          </div>
        )}

        {/* Token field */}
        {mode === 'token' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Registration token</label>
            <div className="flex gap-2">
              <input
                value={token}
                readOnly
                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <Button variant="secondary" size="sm" onClick={generateToken}>
                Regenerate
              </Button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Share this token with users who need to register.</p>
          </div>
        )}

        {/* Toggles */}
        <div className="space-y-3 border-t border-gray-100 pt-4 dark:border-gray-700">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Require approval</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">New accounts stay inactive until activated by an admin.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={requireApproval}
              onClick={() => setRequireApproval(!requireApproval)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${requireApproval ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${requireApproval ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Require email confirmation</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Send a 6-digit code to verify email. Logged to console if SMTP is off.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={requireEmail}
              onClick={() => setRequireEmail(!requireEmail)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${requireEmail ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${requireEmail ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save registration settings</Button>
        </div>
      </div>
    </div>
  )
}

// ── Factory Reset Section ──────────────────────────────────────────────────

function FactoryResetSection() {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const handleReset = async () => {
    if (confirmText !== 'confirm') return
    setLoading(true)
    try {
      await setupApi.factoryReset()
      clearAuth()
      // Navigate to root — the setup check will redirect to the wizard
      window.location.href = '/'
    } catch (err) {
      toast.error(extractError(err))
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-white shadow-sm dark:border-red-900/50 dark:bg-gray-800">
      <div className="flex items-center gap-3 border-b border-red-100 px-6 py-4 dark:border-red-900/30">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Factory Reset</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Wipe all data and restart the setup wizard. This action is irreversible.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-6">
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400">
          This will permanently delete <strong>all users, books, libraries, loans, groups, settings,
          and audit logs</strong>. The system will return to the initial setup wizard.
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Type <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-bold text-red-600 dark:bg-gray-700 dark:text-red-400">confirm</code> to proceed
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type confirm"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        <div className="flex justify-end">
          <Button
            variant="danger"
            onClick={handleReset}
            loading={loading}
            disabled={confirmText !== 'confirm'}
          >
            <AlertTriangle className="h-4 w-4" /> Factory Reset
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Developer Options Section ─────────────────────────────────────────────

function DeveloperSection() {
  const [devMode, setDevMode] = useState(false)
  const [devSeeded, setDevSeeded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    setupApi.status().then((s) => {
      setDevMode(s.devMode)
      setDevSeeded(s.devSeeded)
    }).catch(() => {})
  }, [])

  const handleToggle = async () => {
    // Show warning before enabling
    if (!devMode) {
      setShowConfirm(true)
      return
    }
    await doToggle()
  }

  const doToggle = async () => {
    setShowConfirm(false)
    setLoading(true)
    try {
      const res = await setupApi.setDevMode(!devMode)
      setDevMode(res.devMode)
      toast.success(res.devMode ? 'Dev mode enabled' : 'Dev mode disabled')
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40">
          <Code2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900 dark:text-white">Developer Mode</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            For development and testing only. Not intended for production use.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={devMode}
          disabled={loading}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
            loading ? 'cursor-not-allowed opacity-50' : devMode ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'
          }`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${devMode ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Warning when enabling */}
      {showConfirm && (
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/20">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Enable developer mode?</p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              This is intended for development environments only. It enables features like quick-login buttons
              that bypass normal authentication and should never be used in production.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button size="sm" onClick={doToggle} loading={loading}>Enable Dev Mode</Button>
            </div>
          </div>
        </div>
      )}

      {/* Dev mode content */}
      {devMode && (
        <div className="px-6 py-4 space-y-4">
          {/* Dev accounts sub-section — only if seeded */}
          {devSeeded && (
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                Quick-login accounts on <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-700">/login</code>
              </p>
              <div className="space-y-1">
                {[
                  { role: 'Admin', email: 'admin@library.com' },
                  { role: 'Librarian', email: 'librarian@library.com' },
                  { role: 'Member', email: 'member@library.com' },
                ].map((a) => (
                  <div key={a.role} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 dark:bg-gray-700/50">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{a.role}</span>
                    <span className="font-mono text-xs text-gray-400">{a.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!devSeeded && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Dev mode is on but the database wasn't seeded with dev accounts. Quick-login buttons won't appear on the sign-in page.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/admin" className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Admin
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-lg bg-gray-100 p-2.5 dark:bg-gray-700">
          <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">System configuration and preferences</p>
        </div>
      </div>

      <div className="space-y-8">
        <GeneralSettings />
        <SmtpSettings />
        <RegistrationSettings />
        <DeveloperSection />
        <FactoryResetSection />
      </div>
    </div>
  )
}
