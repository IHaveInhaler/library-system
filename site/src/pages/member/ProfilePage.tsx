import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { User as UserIcon, Shield, Key, Camera, Trash2, AlertTriangle, CheckCircle2, Copy } from 'lucide-react'
import { twoFactorApi, type TotpSetupResponse } from '../../api/twoFactor'
import { uploadsApi } from '../../api/uploads'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { extractError } from '../../api/client'

const roleBadgeVariant: Record<string, 'purple' | 'blue' | 'green' | 'gray'> = {
  ADMIN: 'purple',
  LIBRARIAN: 'blue',
  MEMBER: 'green',
}

// ── Profile Section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const upload = useMutation({
    mutationFn: (file: File) => uploadsApi.uploadAvatar(user!.id, file),
    onSuccess: (updated) => {
      toast.success('Avatar updated')
      qc.setQueryData(['me'], updated)
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const remove = useMutation({
    mutationFn: () => uploadsApi.deleteAvatar(user!.id),
    onSuccess: () => {
      toast.success('Avatar removed')
      qc.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  if (!user) return null

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload.mutate(file)
    e.target.value = ''
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
          <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Profile</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Your account information</p>
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Avatar"
                className="h-20 w-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {initials}
              </div>
            )}

            <p className="text-[10px] text-gray-400 dark:text-gray-500">Recommended: 256×256px</p>
            <div className="flex gap-1.5">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileRef.current?.click()}
                loading={upload.isPending}
                title="Upload avatar"
              >
                <Camera className="h-4 w-4" />
              </Button>
              {user.avatarUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove.mutate()}
                  loading={remove.isPending}
                  title="Remove avatar"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {user.firstName} {user.lastName}
              </h3>
              <Badge label={user.role} variant={roleBadgeVariant[user.role] ?? 'gray'} />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Two-Factor Authentication Section ────────────────────────────────────────

function TwoFactorSection() {
  const qc = useQueryClient()
  const [setupData, setSetupData] = useState<TotpSetupResponse | null>(null)
  const [verifyCode, setVerifyCode] = useState('')

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: twoFactorApi.status,
  })

  const { data: securityKeys, isLoading: keysLoading } = useQuery({
    queryKey: ['2fa-security-keys'],
    queryFn: twoFactorApi.securityKeys,
  })

  const setup = useMutation({
    mutationFn: twoFactorApi.totpSetup,
    onSuccess: (data) => setSetupData(data),
    onError: (err) => toast.error(extractError(err)),
  })

  const verify = useMutation({
    mutationFn: (code: string) => twoFactorApi.totpVerify(code),
    onSuccess: () => {
      toast.success('TOTP enabled successfully')
      setSetupData(null)
      setVerifyCode('')
      qc.invalidateQueries({ queryKey: ['2fa-status'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const removeTotp = useMutation({
    mutationFn: twoFactorApi.totpRemove,
    onSuccess: () => {
      toast.success('TOTP removed')
      qc.invalidateQueries({ queryKey: ['2fa-status'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const removeKey = useMutation({
    mutationFn: twoFactorApi.removeSecurityKey,
    onSuccess: () => {
      toast.success('Security key removed')
      qc.invalidateQueries({ queryKey: ['2fa-security-keys'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret)
    toast.success('Secret copied to clipboard')
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
          <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
        </div>
      </div>
      <div className="space-y-6 p-6">
        {statusLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        ) : (
          <>
            {/* 2FA required warning */}
            {status?.required && !status.totpEnabled && status.securityKeyCount === 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>Two-factor authentication is required for your role. Please set up at least one method below.</p>
              </div>
            )}

            {/* TOTP subsection */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Authenticator App (TOTP)</h3>

              {status?.totpEnabled ? (
                <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">TOTP enabled</span>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removeTotp.mutate()}
                    loading={removeTotp.isPending}
                  >
                    Remove
                  </Button>
                </div>
              ) : setupData ? (
                /* Setup flow: QR + manual secret + verify */
                <div className="space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Scan the QR code with your authenticator app, or enter the secret manually.
                  </p>
                  <div className="flex justify-center">
                    <img
                      src={setupData.qrCode}
                      alt="TOTP QR Code"
                      className="h-48 w-48 rounded-lg bg-white p-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Manual secret</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-mono text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white break-all">
                        {setupData.secret}
                      </code>
                      <Button variant="ghost" size="sm" onClick={() => copySecret(setupData.secret)} title="Copy secret">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        label="Verification code"
                        placeholder="000000"
                        maxLength={6}
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <Button
                      onClick={() => verify.mutate(verifyCode)}
                      loading={verify.isPending}
                      disabled={verifyCode.length !== 6}
                    >
                      Verify
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSetupData(null); setVerifyCode('') }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setup.mutate()} loading={setup.isPending}>
                  Set up TOTP
                </Button>
              )}
            </div>

            {/* Security Keys subsection */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Security Keys</h3>

              {keysLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
              ) : securityKeys && securityKeys.length > 0 ? (
                <div className="space-y-2">
                  {securityKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{key.name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          Added {new Date(key.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removeKey.mutate(key.id)}
                        loading={removeKey.isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center dark:border-gray-700">
                  <Key className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No security keys registered</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Profile Page ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
      <div className="space-y-8">
        <ProfileSection />
        <TwoFactorSection />
      </div>
    </div>
  )
}
