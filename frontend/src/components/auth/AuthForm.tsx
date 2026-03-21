import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PasswordInput } from './PasswordInput'

// Zod schemas — mirror backend Bean Validation rules
const baseSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

const registerSchema = baseSchema.extend({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(15, 'Password must be at most 15 characters.'),
})

const loginSchema = baseSchema

type FormValues = {
  email: string;
  password: string;
}

interface AuthFormProps {
  mode: 'register' | 'login';
  onSubmit: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function AuthForm({ mode, onSubmit, isLoading, error }: AuthFormProps) {
  const schema = mode === 'register' ? registerSchema : loginSchema

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const handleFormSubmit = async (values: FormValues) => {
    await onSubmit(values.email, values.password)
  }

  const isRegister = mode === 'register'

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      aria-label={isRegister ? 'Register form' : 'Login form'}
      className="space-y-5"
    >
      {/* Email field */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email address
        </label>
        <div className="mt-1">
          <input
            id="email"
            type="email"
            autoComplete="email"
            disabled={isLoading}
            placeholder="you@example.com"
            {...register('email')}
            className={[
              'w-full rounded-md border px-3 py-2 text-sm shadow-sm',
              'placeholder-gray-400 focus:outline-none focus:ring-2',
              errors.email
                ? 'border-red-500 focus:ring-red-400'
                : 'border-gray-300 focus:ring-indigo-500',
              isLoading ? 'cursor-not-allowed bg-gray-100 opacity-60' : 'bg-white',
            ].join(' ')}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>
      </div>

      {/* Password field */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <div className="mt-1">
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <PasswordInput
                id="password"
                name="password"
                value={field.value}
                onChange={field.onChange}
                error={errors.password?.message ?? null}
                disabled={isLoading}
                placeholder={
                  isRegister
                    ? 'Create a password (8-15 characters)'
                    : 'Enter your password'
                }
              />
            )}
          />
        </div>
      </div>

      {/* Server-side error banner */}
      {error && (
        <div
          role="alert"
          className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200"
        >
          {error}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading}
        className={[
          'w-full rounded-md px-4 py-2 text-sm font-semibold text-white',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
          'transition-colors duration-150',
          isLoading
            ? 'cursor-not-allowed bg-indigo-400'
            : 'bg-indigo-600 hover:bg-indigo-700',
        ].join(' ')}
      >
        {isLoading
          ? isRegister
            ? 'Creating account...'
            : 'Signing in...'
          : isRegister
            ? 'Create account'
            : 'Sign in'}
      </button>
    </form>
  )
}
