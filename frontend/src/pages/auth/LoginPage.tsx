import { useNavigate, Link } from 'react-router-dom'
import { AuthForm } from '../../components/auth/AuthForm'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../store/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error, fieldErrors } = useAuth()

  const handleSubmit = async (email: string, password: string): Promise<void> => {
    try {
      await login(email, password)
      const role = useAuthStore.getState().user?.role
      if (role === 'ADMIN') {
        navigate('/admin/plans')
      } else {
        navigate('/home')
      }
    } catch {
      // Error is displayed via the error state in useAuth — no navigation on failure
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          {/* Logo mark */}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M13 2L4.5 13.5H11L9 22L19.5 9.5H13.5L16 2Z" fill="white" />
            </svg>
          </div>
          {/* Wordmark */}
          <span className="text-3xl font-bold leading-tight text-white">GymFlow</span>
          {/* Page heading */}
          <h1 className="text-xl font-semibold leading-tight text-gray-400">Sign in to your account</h1>
          {/* Navigation link */}
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-green-400 hover:text-green-300 transition-colors duration-200 focus-visible:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-green-500"
            >
              Register
            </Link>
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-xl shadow-black/50 px-8 py-10 w-full max-w-md">
          <AuthForm
            mode="login"
            onSubmit={handleSubmit}
            isLoading={isLoading}
            error={error}
            fieldErrors={fieldErrors}
          />
        </div>
      </div>
    </div>
  )
}
