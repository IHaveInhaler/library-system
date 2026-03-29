import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Settings, Mail, Lock, AlertTriangle, Code2, Users, Globe, IdCard, Palette, ShieldCheck, Barcode, Printer, Image as ImageIcon, Search, ClipboardList, List } from 'lucide-react'
import { settingsApi, type SettingKey } from '../../api/settings'
import { groupsApi } from '../../api/groups'
import { setupApi } from '../../api/setup'
import { useAuthStore } from '../../store/auth'
import { useBrandStore } from '../../store/brand'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
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
            Used for password resets, account invites, email verification, and notifications. If disabled, links and codes are logged to the server console.
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
  const [behindProxy, setBehindProxy] = useState(false)

  useEffect(() => {
    if (data) {
      setBaseUrl(data.settings['app.baseUrl'] || '')
      setBehindProxy(data.settings['app.behindProxy'] === 'true')
    }
  }, [data])

  const locked = data?.locked ?? []
  const isLocked = locked.includes('app.baseUrl' as SettingKey)

  const save = useMutation({
    mutationFn: () => settingsApi.update({ 'app.baseUrl': baseUrl, 'app.behindProxy': behindProxy ? 'true' : 'false' }),
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

        <label className="flex items-center justify-between cursor-pointer rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Behind reverse proxy</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Enable if the site is behind nginx, Caddy, Cloudflare, or another reverse proxy. Ensures correct IP forwarding and URL generation.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={behindProxy}
            onClick={() => setBehindProxy(!behindProxy)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${behindProxy ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${behindProxy ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </label>

        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save</Button>
        </div>
      </div>
    </div>
  )
}

// ── Membership Settings Section ───────────────────────────────────────────

function MembershipSettings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const [calendarMode, setCalendarMode] = useState(true)

  useEffect(() => {
    if (data) {
      // Default is true (calendar mode) — only false if explicitly set to 'false'
      setCalendarMode(data.settings['membership.calendarMonths'] !== 'false')
    }
  }, [data])

  const save = useMutation({
    mutationFn: () => settingsApi.update({ 'membership.calendarMonths': calendarMode ? 'true' : 'false' }),
    onSuccess: (res) => { toast.success('Membership settings saved'); qc.setQueryData(['settings'], res) },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40">
          <IdCard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Memberships</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">How membership durations are calculated.</p>
        </div>
      </div>
      <div className="space-y-4 p-6">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Calendar month mode</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {calendarMode
                ? 'Monthly = same day next month (e.g. Jan 14 → Feb 14). Yearly = same day next year.'
                : 'Monthly = +30 days. Yearly = +365 days.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={calendarMode}
            onClick={() => setCalendarMode(!calendarMode)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${calendarMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${calendarMode ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </label>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save</Button>
        </div>
      </div>
    </div>
  )
}

// ── Loan Settings Section ────────────────────────────────────────────────

function LoanSettings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })

  const [durationDays, setDurationDays] = useState('14')
  const [renewalDays, setRenewalDays] = useState('7')
  const [maxRenewals, setMaxRenewals] = useState('2')
  const [renewalCutoffDays, setRenewalCutoffDays] = useState('14')
  const [reservationExpiryDays, setReservationExpiryDays] = useState('3')

  useEffect(() => {
    if (data) {
      setDurationDays(data.settings['loan.durationDays'] || '14')
      setRenewalDays(data.settings['loan.renewalDays'] || '7')
      setMaxRenewals(data.settings['loan.maxRenewals'] || '2')
      setRenewalCutoffDays(data.settings['loan.renewalCutoffDays'] || '14')
      setReservationExpiryDays(data.settings['loan.reservationExpiryDays'] || '3')
    }
  }, [data])

  const save = useMutation({
    mutationFn: () => settingsApi.update({
      'loan.durationDays': durationDays,
      'loan.renewalDays': renewalDays,
      'loan.maxRenewals': maxRenewals,
      'loan.renewalCutoffDays': renewalCutoffDays,
      'loan.reservationExpiryDays': reservationExpiryDays,
    }),
    onSuccess: (res) => { toast.success('Loan settings saved'); qc.setQueryData(['settings'], res) },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
          <ClipboardList className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Loans &amp; Extensions</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Configure loan durations, extension limits, and overdue policies.</p>
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Default loan duration (days)</label>
            <input
              type="number"
              min="1"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Extension duration (days)</label>
            <input
              type="number"
              min="1"
              value={renewalDays}
              onChange={(e) => setRenewalDays(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Maximum extensions</label>
            <input
              type="number"
              min="0"
              value={maxRenewals}
              onChange={(e) => setMaxRenewals(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Extension cutoff (days overdue)</label>
            <input
              type="number"
              min="1"
              value={renewalCutoffDays}
              onChange={(e) => setRenewalCutoffDays(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Loans overdue by more than this many days cannot be extended</p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Reservation expiry (days)</label>
          <input
            type="number"
            min="1"
            value={reservationExpiryDays}
            onChange={(e) => setReservationExpiryDays(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save loan settings</Button>
        </div>
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

// ── White Label Section ───────────────────────────────────────────────────

function WhiteLabelSettings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })

  const [appName, setAppName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#3b82f6')
  const [faviconUrl, setFaviconUrl] = useState('')

  useEffect(() => {
    if (data) {
      setAppName(data.settings['brand.appName'] || '')
      setLogoUrl(data.settings['brand.logoUrl'] || '')
      setPrimaryColor(data.settings['brand.primaryColor'] || '#3b82f6')
      setFaviconUrl(data.settings['brand.faviconUrl'] || '')
    }
  }, [data])

  const loadBrand = useBrandStore((s) => s.load)

  const save = useMutation({
    mutationFn: () => settingsApi.update({
      'brand.appName': appName,
      'brand.logoUrl': logoUrl,
      'brand.primaryColor': primaryColor,
      'brand.faviconUrl': faviconUrl,
    }),
    onSuccess: (res) => { toast.success('White label settings saved'); qc.setQueryData(['settings'], res) },
    onError: (err) => toast.error(extractError(err)),
  })

  const resetDefaults = useMutation({
    mutationFn: () => settingsApi.update({
      'brand.appName': '',
      'brand.logoUrl': '',
      'brand.primaryColor': '',
      'brand.faviconUrl': '',
    }),
    onSuccess: (res) => {
      qc.setQueryData(['settings'], res)
      setAppName('')
      setLogoUrl('')
      setPrimaryColor('#2563eb')
      setFaviconUrl('')
      loadBrand()
      toast.success('Defaults restored')
    },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
          <Palette className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">White Label</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Customize the look and feel of your portal.</p>
        </div>
      </div>

      <div className="space-y-4 p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">App name</label>
          <input
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="Library Portal"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Logo URL</label>
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Primary color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 bg-white p-1 dark:border-gray-600 dark:bg-gray-700"
            />
            <input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#3b82f6"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Favicon URL</label>
          <input
            value={faviconUrl}
            onChange={(e) => setFaviconUrl(e.target.value)}
            placeholder="https://example.com/favicon.ico"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => resetDefaults.mutate()} loading={resetDefaults.isPending}>Reset to Defaults</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save</Button>
        </div>
      </div>
    </div>
  )
}

// ── Two-Factor Authentication Section ────────────────────────────────────

function TwoFactorSettings() {
  const qc = useQueryClient()
  const { data: settingsData, isLoading: settingsLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const { data: groups, isLoading: groupsLoading } = useQuery({ queryKey: ['groups'], queryFn: groupsApi.list })

  const [requiredRoles, setRequiredRoles] = useState<string[]>([])
  const [securityKeysOnly, setSecurityKeysOnly] = useState(false)

  useEffect(() => {
    if (settingsData) {
      try {
        const parsed = JSON.parse(settingsData.settings['2fa.requiredRoles'] || '[]')
        setRequiredRoles(Array.isArray(parsed) ? parsed : [])
      } catch {
        setRequiredRoles([])
      }
      setSecurityKeysOnly(settingsData.settings['2fa.securityKeysOnly'] === 'true')
    }
  }, [settingsData])

  const toggleRole = (name: string) => {
    setRequiredRoles((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]
    )
  }

  const save = useMutation({
    mutationFn: () => settingsApi.update({
      '2fa.requiredRoles': JSON.stringify(requiredRoles),
      '2fa.securityKeysOnly': securityKeysOnly ? 'true' : 'false',
    }),
    onSuccess: (res) => { toast.success('2FA settings saved'); qc.setQueryData(['settings'], res) },
    onError: (err) => toast.error(extractError(err)),
  })

  if (settingsLoading || groupsLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
          <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Require 2FA for specific roles.</p>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {groups && groups.length > 0 ? (
          <div className="space-y-2">
            {groups.map((group) => (
              <label
                key={group.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
              >
                <input
                  type="checkbox"
                  checked={requiredRoles.includes(group.name)}
                  onChange={() => toggleRole(group.name)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {group.name.charAt(0) + group.name.slice(1).toLowerCase().replace(/_/g, ' ')}
                  </p>
                  {group.description && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{group.description}</p>
                  )}
                </div>
                {group.isBuiltIn && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">built-in</span>
                )}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No groups found.</p>
        )}

        <label className="flex items-center justify-between cursor-pointer rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Security keys only</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              When enabled, only hardware security keys are accepted — TOTP codes will be rejected for enforced roles.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={securityKeysOnly}
            onClick={() => setSecurityKeysOnly(!securityKeysOnly)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${securityKeysOnly ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${securityKeysOnly ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </label>

        <div className="flex gap-4 text-xs">
          <a href="https://1password.com/blog/hardware-security-keys-explained" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline dark:text-blue-400">Learn about security keys →</a>
          <a href="https://1password.com/blog/totp-and-1password#what-is-totp" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline dark:text-blue-400">What is TOTP? →</a>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-400">
          When developer mode is enabled, 2FA requirements are bypassed.
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save</Button>
        </div>
      </div>
    </div>
  )
}

// ── Barcode Settings Section ──────────────────────────────────────────────

function BarcodeSettings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const [shelfFormat, setShelfFormat] = useState('{PREFIX}-{POSITION}{DIGITS}{CHECK}')
  const [copyFormat, setCopyFormat] = useState('{ISBN}-{DIGITS}-{CHECK}')

  useEffect(() => {
    if (data) {
      setShelfFormat(data.settings['barcode.shelfFormat'] || '{PREFIX}-{POSITION}{DIGITS}{CHECK}')
      setCopyFormat(data.settings['barcode.copyFormat'] || '{ISBN}-{DIGITS}-{CHECK}')
    }
  }, [data])

  const save = useMutation({
    mutationFn: () => settingsApi.update({ 'barcode.shelfFormat': shelfFormat, 'barcode.copyFormat': copyFormat }),
    onSuccess: (res) => { toast.success('Barcode settings saved'); qc.setQueryData(['settings'], res) },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
          <Barcode className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Barcodes</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Format templates for shelf labels and book copy barcodes.</p>
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div>
          <Input label="Shelf label format" value={shelfFormat} onChange={(e) => setShelfFormat(e.target.value)} />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Variables: <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">{'{PREFIX}'}</code> <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">{'{POSITION}'}</code> <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">{'{DIGITS}'}</code> <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">{'{CHECK}'}</code>
          </p>
        </div>
        <div>
          <Input label="Book copy barcode format" value={copyFormat} onChange={(e) => setCopyFormat(e.target.value)} />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Variables: <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">{'{ISBN}'}</code> <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">{'{DIGITS}'}</code> <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">{'{CHECK}'}</code> <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">{'{PREFIX}'}</code> <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">{'{SEQ}'}</code> <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">{'{RANDOM}'}</code>
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save</Button>
        </div>
      </div>
    </div>
  )
}

// ── Printing Settings Section ─────────────────────────────────────────────

function PrintingSettings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const [method, setMethod] = useState('browser')
  const [zplHost, setZplHost] = useState('')
  const [zplPort, setZplPort] = useState('9100')
  const [zplWidth, setZplWidth] = useState('50')
  const [zplHeight, setZplHeight] = useState('25')
  const [ippUrl, setIppUrl] = useState('')

  useEffect(() => {
    if (data) {
      setMethod(data.settings['print.method'] || 'browser')
      setZplHost(data.settings['print.zpl.host'] || '')
      setZplPort(data.settings['print.zpl.port'] || '9100')
      setZplWidth(data.settings['print.zpl.labelWidth'] || '50')
      setZplHeight(data.settings['print.zpl.labelHeight'] || '25')
      setIppUrl(data.settings['print.ipp.printerUrl'] || '')
    }
  }, [data])

  const save = useMutation({
    mutationFn: () => settingsApi.update({
      'print.method': method,
      'print.zpl.host': zplHost,
      'print.zpl.port': zplPort,
      'print.zpl.labelWidth': zplWidth,
      'print.zpl.labelHeight': zplHeight,
      'print.ipp.printerUrl': ippUrl,
    }),
    onSuccess: (res) => { toast.success('Printing settings saved'); qc.setQueryData(['settings'], res) },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
          <Printer className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Printing</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Configure how barcode labels are printed.</p>
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Print Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            <option value="browser">Browser Print Dialog</option>
            <option value="zpl">ZPL (Zebra Thermal Printer)</option>
            <option value="ipp">IPP (Network Printer)</option>
          </select>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            {method === 'browser' && 'Uses the browser\'s built-in print dialog. Works with any printer.'}
            {method === 'zpl' && 'Sends ZPL commands directly to a Zebra thermal label printer over the network.'}
            {method === 'ipp' && 'Sends print jobs to a network printer using the Internet Printing Protocol.'}
          </p>
        </div>

        {method === 'zpl' && (
          <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">ZPL Printer Settings</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Printer IP / Hostname" placeholder="e.g. 192.168.1.50" value={zplHost} onChange={(e) => setZplHost(e.target.value)} />
              <Input label="Port" placeholder="9100" value={zplPort} onChange={(e) => setZplPort(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Label Width (mm)" placeholder="50" value={zplWidth} onChange={(e) => setZplWidth(e.target.value)} />
              <Input label="Label Height (mm)" placeholder="25" value={zplHeight} onChange={(e) => setZplHeight(e.target.value)} />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Standard library label: 50 x 25 mm. The printer must be network-accessible from the server.
            </p>
          </div>
        )}

        {method === 'ipp' && (
          <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">IPP Printer Settings</p>
            <Input label="Printer URL" placeholder="e.g. http://192.168.1.50:631/ipp/print" value={ippUrl} onChange={(e) => setIppUrl(e.target.value)} />
            <p className="text-xs text-gray-400 dark:text-gray-500">
              The IPP URL of your network printer. Usually <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">http://printer-ip:631/ipp/print</code>
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save</Button>
        </div>
      </div>
    </div>
  )
}

// ── Image Upload Settings Section ────────────────────────────────────────────

function ImageUploadSettings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const [maxSize, setMaxSize] = useState('5')
  const [avatarMax, setAvatarMax] = useState('2')
  const [libraryMax, setLibraryMax] = useState('5')
  const [allowedTypes, setAllowedTypes] = useState('image/jpeg, image/png, image/webp')

  useEffect(() => {
    if (data) {
      setMaxSize(data.settings['images.maxSizeMB'] || '5')
      setAvatarMax(data.settings['images.avatarMaxSizeMB'] || '2')
      setLibraryMax(data.settings['images.libraryMaxSizeMB'] || '5')
      setAllowedTypes(data.settings['images.allowedTypes'] || 'image/jpeg, image/png, image/webp')
    }
  }, [data])

  const save = useMutation({
    mutationFn: () => settingsApi.update({
      'images.maxSizeMB': maxSize,
      'images.avatarMaxSizeMB': avatarMax,
      'images.libraryMaxSizeMB': libraryMax,
      'images.allowedTypes': allowedTypes,
    }),
    onSuccess: (res) => { toast.success('Image settings saved'); qc.setQueryData(['settings'], res) },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-900/40">
          <ImageIcon className="h-4 w-4 text-pink-600 dark:text-pink-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Image Uploads</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Configure file size limits and allowed types for all image uploads.</p>
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-3 gap-3">
          <Input label="Default max (MB)" type="number" value={maxSize} onChange={(e) => setMaxSize(e.target.value)} />
          <Input label="Avatar max (MB)" type="number" value={avatarMax} onChange={(e) => setAvatarMax(e.target.value)} />
          <Input label="Library max (MB)" type="number" value={libraryMax} onChange={(e) => setLibraryMax(e.target.value)} />
        </div>
        <div>
          <Input label="Allowed MIME types" value={allowedTypes} onChange={(e) => setAllowedTypes(e.target.value)} />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Comma-separated. Default: image/jpeg, image/png, image/webp</p>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save</Button>
        </div>
      </div>
    </div>
  )
}

// ── Book Conditions Section ──────────────────────────────────────────────

function BookConditionsSettings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const [conditions, setConditions] = useState<string[]>([])
  const [newCondition, setNewCondition] = useState('')

  useEffect(() => {
    if (data) {
      const raw = data.settings['copy.conditions']
      try {
        const parsed = JSON.parse(raw || '[]')
        setConditions(Array.isArray(parsed) ? parsed : ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'])
      } catch {
        setConditions(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'])
      }
    }
  }, [data])

  const save = useMutation({
    mutationFn: () => settingsApi.update({ 'copy.conditions': JSON.stringify(conditions) }),
    onSuccess: (res) => { toast.success('Conditions saved'); qc.setQueryData(['settings'], res) },
    onError: (err) => toast.error(extractError(err)),
  })

  const addCondition = () => {
    const val = newCondition.trim().toUpperCase()
    if (!val || conditions.includes(val)) return
    setConditions([...conditions, val])
    setNewCondition('')
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const arr = [...conditions]
    ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
    setConditions(arr)
  }

  const moveDown = (index: number) => {
    if (index === conditions.length - 1) return
    const arr = [...conditions]
    ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
    setConditions(arr)
  }

  if (isLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
          <List className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Book Conditions</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Configure the condition options available for book copies.</p>
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div className="space-y-2">
          {conditions.map((c, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-700">
              <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{c}</span>
              <button onClick={() => moveUp(i)} disabled={i === 0} className="rounded p-1 text-gray-400 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-600">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              </button>
              <button onClick={() => moveDown(i)} disabled={i === conditions.length - 1} className="rounded p-1 text-gray-400 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-600">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              <button onClick={() => removeCondition(i)} className="rounded p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCondition()}
            placeholder="Add condition…"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
          <Button variant="secondary" onClick={addCondition} disabled={!newCondition.trim()}>Add</Button>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save</Button>
        </div>
      </div>
    </div>
  )
}

// ── Factory Reset Section ──────────────────────────────────────────────────

function FactoryResetSection() {
  const [phase, setPhase] = useState<'confirm' | 'code'>('confirm')
  const [confirmText, setConfirmText] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const requestCode = async () => {
    if (confirmText !== 'confirm') return
    setLoading(true)
    try {
      await setupApi.factoryResetChallenge()
      setPhase('code')
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  const executeReset = async () => {
    if (code.length < 6) return
    setLoading(true)
    try {
      await setupApi.factoryResetVerify(code)
      clearAuth()
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

        {phase === 'confirm' && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-bold text-red-600 dark:bg-gray-700 dark:text-red-400">confirm</code> to proceed
              </label>
              <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type confirm"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500" />
            </div>
            <div className="flex justify-end">
              <Button variant="danger" onClick={requestCode} loading={loading} disabled={confirmText !== 'confirm'}>
                <AlertTriangle className="h-4 w-4" /> Continue
              </Button>
            </div>
          </>
        )}

        {phase === 'code' && (
          <>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700/50 dark:bg-blue-900/20">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Check the server logs</p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                A 6-digit confirmation code has been printed in the Docker Compose logs.
                Run <code className="rounded bg-blue-100 px-1 dark:bg-blue-800">docker-compose logs -f api</code> to view it.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirmation Code</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter 6-digit code"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setPhase('confirm'); setCode(''); setConfirmText('') }}>Cancel</Button>
              <Button variant="danger" onClick={executeReset} loading={loading} disabled={code.length < 6}>
                <AlertTriangle className="h-4 w-4" /> Factory Reset
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Developer Options Section ─────────────────────────────────────────────

function DeveloperSection() {
  const [devMode, setDevMode] = useState(false)
  const [devSeeded, setDevSeeded] = useState(false)
  const [isDev, setIsDev] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    setupApi.status().then((s) => {
      setDevMode(s.devMode)
      setDevSeeded(s.devSeeded)
      setIsDev(s.environment === 'development')
    }).catch(() => {})
  }, [])

  if (!isDev) return null

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

const SETTINGS_SECTIONS = [
  { key: 'general', keywords: ['general', 'app', 'base url', 'proxy'], component: GeneralSettings },
  { key: 'smtp', keywords: ['smtp', 'email', 'mail', 'host', 'port'], component: SmtpSettings },
  { key: 'membership', keywords: ['membership', 'calendar', 'months'], component: MembershipSettings },
  { key: 'loans', keywords: ['loan', 'extension', 'extend', 'renewal', 'renew', 'overdue', 'duration', 'reservation', 'expiry'], component: LoanSettings },
  { key: 'conditions', keywords: ['condition', 'book condition', 'damage', 'good', 'fair', 'poor'], component: BookConditionsSettings },
  { key: 'whitelabel', keywords: ['brand', 'white label', 'whitelabel', 'logo', 'color', 'favicon', 'app name'], component: WhiteLabelSettings },
  { key: 'registration', keywords: ['registration', 'signup', 'sign up', 'domain', 'token', 'approval', 'email confirmation'], component: RegistrationSettings },
  { key: '2fa', keywords: ['2fa', 'two factor', 'mfa', 'security key', 'authenticator', 'passkey'], component: TwoFactorSettings },
  { key: 'barcodes', keywords: ['barcode', 'shelf format', 'copy format', 'isbn', 'prefix'], component: BarcodeSettings },
  { key: 'printing', keywords: ['print', 'printer', 'zpl', 'zebra', 'ipp', 'thermal', 'label'], component: PrintingSettings },
  { key: 'images', keywords: ['image', 'upload', 'avatar', 'size', 'file type'], component: ImageUploadSettings },
  { key: 'developer', keywords: ['developer', 'dev mode', 'debug'], component: DeveloperSection },
  { key: 'reset', keywords: ['factory reset', 'reset', 'wipe', 'delete'], component: FactoryResetSection },
]

export default function AdminSettingsPage() {
  const [search, setSearch] = useState('')

  const q = search.toLowerCase().trim()
  const filtered = q
    ? SETTINGS_SECTIONS.filter((s) => s.keywords.some((kw) => kw.includes(q)))
    : SETTINGS_SECTIONS

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/admin" className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Admin
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-gray-100 p-2.5 dark:bg-gray-700">
          <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">System configuration and preferences</p>
        </div>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search settings…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
        />
      </div>

      <div className="space-y-8">
        {filtered.map(({ key, component: Component }) => (
          <Component key={key} />
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No settings match "{search}"</p>
        )}
      </div>
    </div>
  )
}
