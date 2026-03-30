import { Link } from 'react-router-dom'

export function LandingFooter() {
  return (
    <footer className="border-t border-gray-900/80 bg-gray-950/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-lg font-bold text-white">GymFlow</p>
          <p className="mt-2 text-sm text-gray-400">
            Membership-first access for one gym, with a clearer path into booking.
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
          <a href="#plans" className="transition-colors duration-200 hover:text-white">
            Plans
          </a>
          <Link to="/login" className="transition-colors duration-200 hover:text-white">
            Sign in
          </Link>
          <Link to="/register" className="transition-colors duration-200 hover:text-white">
            Register
          </Link>
        </nav>
      </div>
    </footer>
  )
}
