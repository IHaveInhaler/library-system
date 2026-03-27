import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BookOpen } from 'lucide-react'
import { useRegister } from '../../hooks/useAuth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { extractError } from '../../api/client'

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email(),
  password: z.string().min(8, 'At least 8 characters'),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const register_ = useRegister()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await register_.mutateAsync(data)
      navigate('/dashboard')
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Join the Library Portal</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" id="firstName" error={errors.firstName?.message} {...register('firstName')} />
            <Input label="Last name" id="lastName" error={errors.lastName?.message} {...register('lastName')} />
          </div>
          <Input label="Email" type="email" id="email" error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" id="password" error={errors.password?.message} {...register('password')} />
          <Button type="submit" loading={register_.isPending} className="w-full">Create account</Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
