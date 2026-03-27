import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { authApi } from '../../api/auth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { extractError } from '../../api/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {sent ? 'Check your email for a reset link.' : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-700/50 dark:bg-green-900/20">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              If an account exists for <strong>{email}</strong>, a reset link has been sent.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Button type="submit" loading={loading} disabled={!email} className="w-full">
              Send reset link
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          <Link to="/login" className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
