import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { useRegister } from '../../../shared/api/services/useAuth'
import { getErrorMessage } from '../../../shared/lib/getErrorMessage'
import { Button } from '../../../shared/ui/Button'
import { FormError } from '../../../shared/ui/FormError'
import { Input } from '../../../shared/ui/Input'
import { registerSchema, type RegisterFormValues } from '../schemas/registerSchema'

export function RegisterForm() {
  const registerMutation = useRegister()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async ({ email, password }: RegisterFormValues) => {
    try {
      await registerMutation.mutateAsync({ email, password })
    } catch (error) {
      setError('root', {
        message: getErrorMessage(error, 'Could not create account.'),
      })
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
      <h1 className="font-display text-2xl font-medium text-ink">
        Create your account
      </h1>

      <Input
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />

      <Input
        id="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <FormError message={errors.root?.message} />

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creating account…' : 'Register'}
      </Button>

      <p className="text-center text-sm text-ink/60">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brass hover:text-ink">
          Log in
        </Link>
      </p>
    </form>
  )
}
