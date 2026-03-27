import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { BookOpen } from 'lucide-react'
import { useLogin } from '../../hooks/useAuth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { extractError } from '../../api/client'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname ?? '/dashboard'
  const login = useLogin()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await login.mutateAsync(data)
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="rounded-xl bg-blue-600 p-3">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sign in</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back to Library Portal</p>
        </div>

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

        {/* Dev credentials — remove before production */}
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800/50">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Dev accounts</p>
          <div className="space-y-1.5">
            {[
              { label: 'Admin', email: 'admin@library.com', password: 'Admin1234!' },
              { label: 'Librarian', email: 'librarian@library.com', password: 'Librarian1!' },
              { label: 'Member', email: 'member@library.com', password: 'Member123!' },
            ].map(({ label, email, password }) => (
              <button
                key={label}
                type="button"
                onClick={async () => {
                  try {
                    await login.mutateAsync({ email, password })
                    navigate(from, { replace: true })
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
      </div>
    </div>
  )
}
