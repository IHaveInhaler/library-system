import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { authApi } from '../../api/auth'
import { Button } from '../../components/ui/Button'
import { extractError } from '../../api/client'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const emailParam = searchParams.get('email') ?? ''
  const [email] = useState(emailParam)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) return
    setLoading(true)
    try {
      const res = await authApi.verifyEmail(email, code)
      setVerified(true)
      setMessage(res.message)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="rounded-xl bg-blue-600 p-3">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verify your email</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {verified ? message : `Enter the 6-digit code sent to ${email || 'your email'}.`}
          </p>
        </div>

        {verified ? (
          <div className="space-y-4 text-center">
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-700/50 dark:bg-green-900/20">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">{message}</p>
            </div>
            <Link
              to="/login"
              className="inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
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
            <Button type="submit" loading={loading} disabled={code.length !== 6} className="w-full">
              Verify
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          <Link to="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
