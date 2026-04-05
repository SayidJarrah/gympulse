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
  /** Field-level errors from the backend (VALIDATION_ERROR). Keyed by field name. */
  fieldErrors?: Record<string, string> | null;
}

export function AuthForm({ mode, onSubmit, isLoading, error, fieldErrors }: AuthFormProps) {
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

  // Merge react-hook-form errors with backend field errors; client-side errors take precedence
  const emailError = errors.email?.message ?? fieldErrors?.email ?? null
  const passwordError = errors.password?.message ?? fieldErrors?.password ?? null

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      aria-label={isRegister ? 'Create account' : 'Sign in'}
      className="flex flex-col gap-5"
    >
      {/* Email field */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-gray-300"
        >
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          disabled={isLoading}
          placeholder="you@example.com"
          {...register('email')}
          aria-invalid={emailError ? 'true' : undefined}
          aria-describedby={emailError ? 'email-error' : undefined}
          className={[
            'w-full rounded-md border bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 focus-visible:border-transparent',
            emailError
              ? 'border-red-500/60 focus-visible:ring-red-500'
              : 'border-gray-700 focus-visible:ring-green-500',
            isLoading ? 'cursor-not-allowed bg-gray-800 opacity-60' : '',
          ].join(' ')}
        />
        {emailError && (
          <p id="email-error" role="alert" className="mt-1 text-xs text-red-400">
            {emailError}
          </p>
        )}
      </div>

      {/* Password field */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-gray-300"
        >
          Password
        </label>
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <PasswordInput
              id="password"
              value={field.value}
              onChange={field.onChange}
              error={passwordError}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              disabled={isLoading}
            />
          )}
        />
      </div>

      {/* Server-side error banner */}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {/* Submit button */}
      {isLoading ? (
        <button
          type="submit"
          disabled
          aria-busy="true"
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-green-500/40 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 cursor-not-allowed"
        >
          <svg
            className="h-5 w-5 animate-spin text-white"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {isRegister ? 'Creating account...' : 'Signing in...'}
        </button>
      ) : (
        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          {isRegister ? 'Create account' : 'Sign in'}
        </button>
      )}
    </form>
  )
}
