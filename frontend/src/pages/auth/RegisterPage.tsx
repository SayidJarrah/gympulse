import { useNavigate, Link } from 'react-router-dom'
import { AuthForm } from '../../components/auth/AuthForm'
import { useAuth } from '../../hooks/useAuth'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register, isLoading, error } = useAuth()

  const handleSubmit = async (email: string, password: string): Promise<void> => {
    try {
      await register(email, password)
      navigate('/login')
    } catch {
      // Error is displayed via the error state in useAuth — no navigation on failure
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            GymFlow
          </h1>
          <h2 className="mt-2 text-xl font-semibold text-gray-700">
            Create your account
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl bg-white px-8 py-10 shadow-md">
          <AuthForm
            mode="register"
            onSubmit={handleSubmit}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </div>
  )
}
