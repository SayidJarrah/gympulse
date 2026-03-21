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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          {/* Logo mark */}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
            {/* dumbbell icon placeholder — use a bold "G" until Heroicons has a dumbbell */}
            <span className="text-lg font-bold text-white">G</span>
          </div>
          {/* Wordmark */}
          <span className="text-3xl font-bold leading-tight text-gray-900">GymFlow</span>
          {/* Page heading */}
          <h1 className="text-xl font-semibold leading-tight text-gray-700">Create your account</h1>
          {/* Navigation link */}
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200 focus-visible:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-md px-8 py-10 w-full max-w-md">
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
