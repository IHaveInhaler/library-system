import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { BookOpen, ShieldCheck, ArrowLeft, Key } from 'lucide-react'
import { useLogin } from '../../hooks/useAuth'
import { useAuthStore } from '../../store/auth'
import { useQueryClient } from '@tanstack/react-query'
import { twoFactorApi } from '../../api/twoFactor'
import { setupApi } from '../../api/setup'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { extractError } from '../../api/client'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type FormData = z.infer<typeof schema>

const DEV_ACCOUNTS = [
  { label: 'Admin', email: 'admin@library.com', password: 'Admin1234!' },
  { label: 'Librarian', email: 'librarian@library.com', password: 'Librarian1!' },
  { label: 'Member', email: 'member@library.com', password: 'Member123!' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname ?? '/dashboard'
  const login = useLogin()
  const { setAuth } = useAuthStore()
  const qc = useQueryClient()
  const [showDevAccounts, setShowDevAccounts] = useState(false)

  // 2FA state
  const [pendingChallengeToken, setPendingChallengeToken] = useState<string | null>(null)
  const [availableMethods, setAvailableMethods] = useState<string[]>([])
  const [showTotpInput, setShowTotpInput] = useState(false)
  const [_showKeyPrompt, setShowKeyPrompt] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [totpLoading, setTotpLoading] = useState(false)
  const [keyLoading, setKeyLoading] = useState(false)
  const totpInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setupApi.status().then((s) => setShowDevAccounts(s.devMode && s.devSeeded)).catch(() => {})
  }, [])

  useEffect(() => {
    if (showTotpInput && totpInputRef.current) {
      totpInputRef.current.focus()
    }
  }, [showTotpInput])

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const handleLoginResult = (data: any) => {
    if (data.requires2FA) {
      setPendingChallengeToken(data.challengeToken)
      setAvailableMethods(data.methods || [])
      // If only one method, go straight to it
      if (data.methods?.length === 1 && data.methods[0] === 'totp') {
        setShowTotpInput(true)
      } else if (data.methods?.length === 1 && data.methods[0] === 'securityKey') {
        handleSecurityKeyAuth(data.challengeToken)
      } else {
        // Show method picker
        setShowTotpInput(true) // Default to TOTP picker, with option to switch
      }
      setTotpCode('')
      return true
    }
    return false
  }

  const handleSecurityKeyAuth = async (challengeToken: string) => {
    setKeyLoading(true)
    setShowKeyPrompt(true)
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser')
      const options = await twoFactorApi.securityKeyAuthOptions(challengeToken)
      const assertion = await startAuthentication({ optionsJSON: options })
      const result = await twoFactorApi.challenge({ challengeToken, method: 'securityKey', assertion })
      setAuth(result.user, result.accessToken, result.refreshToken)
      qc.setQueryData(['me'], result.user)
      navigate(from, { replace: true })
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        toast.error('Authentication cancelled or timed out')
      } else {
        toast.error(extractError(err))
      }
      setShowKeyPrompt(false)
    } finally {
      setKeyLoading(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      const result = await login.mutateAsync(data)
      if (!handleLoginResult(result)) {
        navigate(from, { replace: true })
      }
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  const onTotpSubmit = async () => {
    if (!pendingChallengeToken || totpCode.length !== 6) return
    setTotpLoading(true)
    try {
      const result = await twoFactorApi.challenge({ challengeToken: pendingChallengeToken, method: 'totp', code: totpCode })
      setAuth(result.user, result.accessToken, result.refreshToken)
      qc.setQueryData(['me'], result.user)
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(extractError(err))
      setTotpCode('')
      totpInputRef.current?.focus()
    } finally {
      setTotpLoading(false)
    }
  }

  const resetTotpState = () => {
    setPendingChallengeToken(null)
    setAvailableMethods([])
    setShowTotpInput(false)
    setShowKeyPrompt(false)
    setTotpCode('')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <Link to="/" className="absolute left-4 top-4 flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className={`rounded-xl p-3 ${showTotpInput ? 'bg-amber-500' : 'bg-blue-600'}`}>
            {showTotpInput
              ? <ShieldCheck className="h-7 w-7 text-white" />
              : <BookOpen className="h-7 w-7 text-white" />
            }
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {showTotpInput ? 'Two-factor authentication' : 'Sign in'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {showTotpInput
              ? 'Enter the 6-digit code from your authenticator app'
              : 'Welcome back to Library Portal'
            }
          </p>
        </div>

        {showTotpInput ? (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col gap-1">
              <label htmlFor="totp-code" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Verification code
              </label>
              <input
                ref={totpInputRef}
                id="totp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={totpCode}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setTotpCode(v)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && totpCode.length === 6) onTotpSubmit()
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-center font-mono text-lg tracking-widest text-gray-900 shadow-sm transition placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              />
            </div>
            <Button
              type="button"
              loading={totpLoading}
              disabled={totpCode.length !== 6}
              className="w-full"
              onClick={onTotpSubmit}
            >
              Verify
            </Button>
            {availableMethods.includes('securityKey') && (
              <button
                type="button"
                onClick={() => { setShowTotpInput(false); handleSecurityKeyAuth(pendingChallengeToken!) }}
                disabled={keyLoading}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Key className="h-4 w-4" />
                {keyLoading ? 'Waiting for key...' : 'Use security key instead'}
              </button>
            )}
            <button
              type="button"
              onClick={resetTotpState}
              className="flex w-full items-center justify-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <Input label="Email" type="email" id="email" error={errors.email?.message} {...register('email')} />
              <div>
                <Input label="Password" type="password" id="password" error={errors.password?.message} {...register('password')} />
                <div className="mt-1 text-right">
                  <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline dark:text-blue-400">Forgot password?</Link>
                </div>
              </div>
              <Button type="submit" loading={login.isPending} className="w-full">Sign in</Button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:underline dark:text-blue-400">Register</Link>
            </p>

            {showDevAccounts && (
              <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800/50">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Dev accounts</p>
                <div className="space-y-1.5">
                  {DEV_ACCOUNTS.map(({ label, email, password }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={async () => {
                        try {
                          const result = await login.mutateAsync({ email, password })
                          if (!handleLoginResult(result)) {
                            navigate(from, { replace: true })
                          }
                        } catch (err) {
                          toast.error(extractError(err))
                        }
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-700 dark:hover:bg-blue-900/20"
                    >
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
                      <span className="font-mono text-xs text-gray-400 dark:text-gray-500">{email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
