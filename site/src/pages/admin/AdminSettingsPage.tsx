import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Settings, Mail, Lock } from 'lucide-react'
import { settingsApi, type SettingKey } from '../../api/settings'
import { Button } from '../../components/ui/Button'
import { extractError } from '../../api/client'

type FormState = Record<SettingKey, string>

const EMPTY_FORM: FormState = {
  'smtp.enabled': 'false',
  'smtp.host': '',
  'smtp.port': '587',
  'smtp.user': '',
  'smtp.pass': '',
  'smtp.from': '',
  'app.baseUrl': '',
}

// ── SMTP Section ──────────────────────────────────────────────────────────────
function SmtpSettings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })

  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  useEffect(() => {
    if (data) setForm({ ...EMPTY_FORM, ...data.settings })
  }, [data])

  const locked = data?.locked ?? []
  const isLocked = (key: SettingKey) => locked.includes(key)

  const save = useMutation({
    mutationFn: () => settingsApi.update(form),
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
    key: SettingKey,
    label: string,
    opts: { type?: string; placeholder?: string; disabled?: boolean } = {}
  ) => {
    const locked = isLocked(key)
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

        <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
          {field('app.baseUrl', 'Site base URL', { placeholder: 'https://library.example.com' })}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Used to build password reset links in emails.</p>
        </div>

        {!allSmtpLocked && (
          <div className="flex justify-end pt-2">
            <Button onClick={() => save.mutate()} loading={save.isPending}>Save settings</Button>
          </div>
        )}
      </div>
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

      <SmtpSettings />
    </div>
  )
}
