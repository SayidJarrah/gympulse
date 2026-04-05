import { Link } from 'react-router-dom'
import type { LandingAction } from '../../types/landing'
import { SectionAction } from './SectionAction'

interface Props {
  isAuthenticated: boolean;
  primaryAction: LandingAction;
  onSignInClick: () => void;
}

export function LandingHeader({ isAuthenticated, primaryAction, onSignInClick }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-900/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-500 shadow-lg shadow-green-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M13 2L4.5 13.5H11L9 22L19.5 9.5H13.5L16 2Z" fill="white" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-white">GymFlow</p>
            <p className="text-xs uppercase tracking-[0.24em] text-gray-500">
              Membership-first training
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <a
            href="#plans"
            className="text-sm font-medium text-gray-400 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            Plans
          </a>
          <a
            href="#journey"
            className="text-sm font-medium text-gray-400 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            How it works
          </a>
          <a
            href="#faq"
            className="text-sm font-medium text-gray-400 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {!isAuthenticated && (
            <Link
              to="/login"
              onClick={onSignInClick}
              className="text-sm font-medium text-gray-300 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              Sign in
            </Link>
          )}
          <SectionAction action={primaryAction} variant="primary" />
        </div>
      </div>
    </header>
  )
}
